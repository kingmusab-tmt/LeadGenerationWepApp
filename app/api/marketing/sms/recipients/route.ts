import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { Lead } from "@/models/leads";
import { internalError, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

type BuyerRecipientDoc = {
  phone?: string;
  name?: string;
  company?: string;
};

type LeadFieldDoc = {
  label?: string;
  id?: string;
  value?: unknown;
};

type LeadRecipientDoc = {
  phone?: string;
  name?: string;
  company?: string;
  fields?: LeadFieldDoc[];
};

/**
 * GET /api/marketing/sms/recipients
 * Fetch phone numbers from lead buyers, leads, or both for SMS recipient selection
 * Query params:
 *   source: "buyers" | "leads" | "both" (default: "both")
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "both";

    const results: {
      buyers: Array<{
        phone: string;
        name: string;
        company: string;
        type: string;
      }>;
      leads: Array<{
        phone: string;
        name: string;
        company: string;
        type: string;
      }>;
    } = { buyers: [], leads: [] };

    // Fetch lead buyers with phone numbers
    if (source === "buyers" || source === "both") {
      const buyers = await Buyer.find(
        { registeredWith: session.user.id, isActive: true },
        { phone: 1, name: 1, company: 1 },
      ).lean<BuyerRecipientDoc[]>();

      results.buyers = buyers
        .filter(
          (b): b is BuyerRecipientDoc & { phone: string } =>
            typeof b.phone === "string" && b.phone.trim().length > 0,
        )
        .map((b) => ({
          phone: b.phone,
          name: b.name || "",
          company: b.company || "",
          type: "buyer",
        }));
    }

    // Fetch leads with phone numbers
    if (source === "leads" || source === "both") {
      const leads = await Lead.find(
        { userId: session.user.id },
        { phone: 1, name: 1, company: 1, fields: 1 },
      ).lean<LeadRecipientDoc[]>();

      const phoneRegex = /phone|phone\s*number|mobile|cell/i;
      const nameRegex = /^name$|full\s*name/i;

      results.leads = leads
        .map((l) => {
          // 1. Try top-level phone field
          let phone = l.phone || "";
          // 2. Fallback: search fields array for phone
          if (!phone && l.fields) {
            const phoneField = l.fields.find(
              (f) =>
                phoneRegex.test(f.label || "") || phoneRegex.test(f.id || ""),
            );
            if (phoneField?.value) phone = String(phoneField.value).trim();
          }

          // Extract name: top-level first, then fields array
          let name = l.name || "";
          if (!name && l.fields) {
            const nameField = l.fields.find((f) =>
              nameRegex.test(f.label || ""),
            );
            if (nameField?.value) name = String(nameField.value).trim();
          }

          return {
            phone,
            name,
            company: l.company || "",
            type: "lead",
          };
        })
        .filter((l) => Boolean(l.phone));
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fetching SMS recipients:", error);
    return internalError("Failed to fetch recipients");
  }
}
