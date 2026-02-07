import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { Lead } from "@/models/leads";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      ).lean();

      results.buyers = buyers
        .filter((b: any) => b.email)
        .map((b: any) => ({
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
      ).lean();

      const emailRegex = /email|e-mail/i;
      const nameRegex = /^name$|full\s*name/i;

      results.leads = leads
        .map((l: any) => {
          // 1. Try top-level email field
          let email = l.email || "";
          // 2. Fallback: search fields array for email
          if (!email && l.fields) {
            const emailField = l.fields.find(
              (f: any) =>
                emailRegex.test(f.label || "") || emailRegex.test(f.id || ""),
            );
            if (emailField?.value) email = String(emailField.value).trim();
          }

          // Extract name: top-level first, then fields array
          let name = l.name || "";
          if (!name && l.fields) {
            const nameField = l.fields.find((f: any) =>
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
        .filter((l: { email: string }) => l.email);
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 },
    );
  }
}
