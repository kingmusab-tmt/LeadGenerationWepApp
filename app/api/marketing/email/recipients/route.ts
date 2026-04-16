import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { Lead } from "@/models/leads";
import { internalError, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

type BuyerRecipientDoc = {
  email?: string;
  name?: string;
  company?: string;
};

type LeadFieldDoc = {
  label?: string;
  id?: string;
  value?: unknown;
};

type LeadRecipientDoc = {
  email?: string;
  name?: string;
  company?: string;
  fields?: LeadFieldDoc[];
};

/**
 * GET /api/marketing/email/recipients
 * Fetch lead buyers, leads, or both for recipient selection in email campaigns
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
        email: string;
        name: string;
        company: string;
        type: string;
      }>;
      leads: Array<{
        email: string;
        name: string;
        company: string;
        type: string;
      }>;
    } = { buyers: [], leads: [] };

    // Fetch lead buyers
    if (source === "buyers" || source === "both") {
      const buyers = await Buyer.find(
        { registeredWith: session.user.id, isActive: true },
        { email: 1, name: 1, company: 1 },
      ).lean<BuyerRecipientDoc[]>();

      results.buyers = buyers
        .filter(
          (b): b is BuyerRecipientDoc & { email: string } =>
            typeof b.email === "string" && b.email.trim().length > 0,
        )
        .map((b) => ({
          email: b.email,
          name: b.name || "",
          company: b.company || "",
          type: "buyer",
        }));
    }

    // Fetch leads
    if (source === "leads" || source === "both") {
      const leads = await Lead.find(
        { userId: session.user.id },
        { email: 1, name: 1, company: 1, fields: 1 },
      ).lean<LeadRecipientDoc[]>();

      const emailRegex = /email|e-mail/i;
      const nameRegex = /^name$|full\s*name/i;

      results.leads = leads
        .map((l) => {
          // 1. Try top-level email field
          let email = l.email || "";
          // 2. Fallback: search fields array for email
          if (!email && l.fields) {
            const emailField = l.fields.find(
              (f) =>
                emailRegex.test(f.label || "") || emailRegex.test(f.id || ""),
            );
            if (emailField?.value) email = String(emailField.value).trim();
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
            email,
            name,
            company: l.company || "",
            type: "lead",
          };
        })
        .filter((l) => Boolean(l.email));
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return internalError("Failed to fetch recipients");
  }
}
