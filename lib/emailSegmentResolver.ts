import { Buyer } from "@/models/leadbuyers";
import { Lead } from "@/models/leads";
import { IEmailSegment } from "@/models/emailCampaign";

export interface ResolvedRecipient {
  email: string;
  name: string;
  company: string;
  type: "lead" | "buyer";
  // Tracking only — see models/leads.ts / models/leadbuyers.ts. Surfaced so
  // the recipient picker can show/filter by it; sending is not gated on
  // this yet.
  emailConsent: boolean;
}

type LeadFieldDoc = { label?: string; id?: string; value?: unknown };
type LeadDoc = {
  email?: string;
  name?: string;
  company?: string;
  industry?: string;
  qualityLevel?: "High" | "Medium" | "Low";
  fields?: LeadFieldDoc[];
  marketingConsent?: { email?: { granted?: boolean } };
};
type BuyerDoc = {
  email?: string;
  name?: string;
  company?: string;
  industry?: string;
  isActive?: boolean;
  marketingConsent?: { email?: { granted?: boolean } };
};

const emailFieldRegex = /email|e-mail/i;
const nameFieldRegex = /^name$|full\s*name/i;

function extractLeadEmailAndName(lead: LeadDoc): {
  email: string;
  name: string;
} {
  let email = lead.email || "";
  if (!email && lead.fields) {
    const emailField = lead.fields.find(
      (f) =>
        emailFieldRegex.test(f.label || "") || emailFieldRegex.test(f.id || ""),
    );
    if (emailField?.value) email = String(emailField.value).trim();
  }

  let name = lead.name || "";
  if (!name && lead.fields) {
    const nameField = lead.fields.find((f) =>
      nameFieldRegex.test(f.label || ""),
    );
    if (nameField?.value) name = String(nameField.value).trim();
  }

  return { email, name };
}

/**
 * Resolves a seller's saved segment filters into the actual set of
 * recipients it currently matches. Recomputed on demand (not cached) so a
 * segment always reflects the seller's current leads/buyers, not a stale
 * snapshot from when it was created.
 */
export async function resolveSegmentRecipients(
  sellerId: string,
  filters: IEmailSegment["filters"],
): Promise<ResolvedRecipient[]> {
  const recipients: ResolvedRecipient[] = [];

  if (filters.source === "leads" || filters.source === "both") {
    const query: Record<string, unknown> = { userId: sellerId };
    if (filters.industries && filters.industries.length > 0) {
      query.industry = { $in: filters.industries };
    }
    if (filters.leadQuality && filters.leadQuality.length > 0) {
      query.qualityLevel = { $in: filters.leadQuality };
    }

    const leads = await Lead.find(query, {
      email: 1,
      name: 1,
      company: 1,
      fields: 1,
      marketingConsent: 1,
    }).lean<LeadDoc[]>();

    for (const lead of leads) {
      const { email, name } = extractLeadEmailAndName(lead);
      if (email) {
        recipients.push({
          email,
          name,
          company: lead.company || "",
          type: "lead",
          emailConsent: !!lead.marketingConsent?.email?.granted,
        });
      }
    }
  }

  if (filters.source === "buyers" || filters.source === "both") {
    const query: Record<string, unknown> = { registeredWith: sellerId };
    if (filters.buyerActiveOnly !== false) {
      query.isActive = true;
    }
    if (filters.industries && filters.industries.length > 0) {
      query.industry = { $in: filters.industries };
    }

    const buyers = await Buyer.find(query, {
      email: 1,
      name: 1,
      company: 1,
      marketingConsent: 1,
    }).lean<BuyerDoc[]>();

    for (const buyer of buyers) {
      if (buyer.email) {
        recipients.push({
          email: buyer.email,
          name: buyer.name || "",
          company: buyer.company || "",
          type: "buyer",
          emailConsent: !!buyer.marketingConsent?.email?.granted,
        });
      }
    }
  }

  // De-dupe by email — a lead and buyer record could share an address.
  const seen = new Set<string>();
  return recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
