import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { ILead, Lead } from "@/models/leads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Papa from "papaparse";
import {
  checkAndIncrementUsage,
  checkFeatureAccess,
} from "@/lib/subscriptionLimitsService";
import {
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";
import { ZapierTriggerHelper } from "@/lib/integrations/zapierTriggerHelper";
import { DEFAULT_LEAD_FORM_FIELDS } from "@/lib/defaultLeadFormFields";

interface Field {
  id: string;
  label: string;
  value: unknown;
}

// Alternate header spellings a CSV column might use for each default-form
// field, checked in order after the field's own id/label.
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["full name", "fullname"],
  email: ["e-mail", "email address"],
  phone: ["mobile", "phone number", "contact"],
  city: [],
  address: ["street address"],
  service_needed: ["service needed", "service", "notes"],
};

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    // The frontend only hides the Import button for plans without this
    // entitlement — without this check, anyone could call this route
    // directly and bypass that paywall regardless of plan.
    const featureCheck = await checkFeatureAccess(session.user.id, "imports");
    if (!featureCheck.allowed) {
      return forbidden(
        featureCheck.message || "CSV import is not available on your plan.",
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return badRequest("No file provided");
    }

    // Read the file content
    const fileContent = await file.text();

    // Parse CSV
    const results = Papa.parse<string[]>(fileContent, {
      skipEmptyLines: true,
    });

    if (!results.data || results.data.length < 2) {
      return badRequest("CSV must have at least a header row and one data row");
    }

    const [headers, ...rows] = results.data;

    // Check subscription limit for leads (check for total import count)
    const importCount = rows.length;
    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "leads",
      importCount,
    );
    if (!usageCheck.allowed) {
      const remaining = Math.max(0, usageCheck.limit - usageCheck.currentUsage);
      return forbidden(
        `Lead limit would be exceeded. You can import ${remaining} more leads (current: ${usageCheck.currentUsage}/${usageCheck.limit}). Please upgrade your plan.`,
      );
    }

    // Prepare leads for import. Every imported lead is built against the
    // exact same field set as the "Add Lead" dialog's default form (see
    // lib/defaultLeadFormFields.ts) — an imported lead and a manually-added
    // default-form lead always have matching field ids/labels, so editing
    // either one later lines up against the same form structure.
    const leadsToImport = rows.map((row) => {
      // Create a map of header to value for easy lookup
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header.toLowerCase().trim()] = row[index] || "";
      });

      const fields: Field[] = DEFAULT_LEAD_FORM_FIELDS.map((fieldDef) => {
        const candidates = [
          fieldDef.id.replace(/_/g, " "),
          fieldDef.label.toLowerCase(),
          ...(HEADER_ALIASES[fieldDef.id] || []),
        ];
        const value =
          candidates.map((key) => rowData[key]).find((v) => v) || "";
        return { id: fieldDef.id, label: fieldDef.label, value };
      });

      const getFieldValue = (id: string) =>
        String(fields.find((f) => f.id === id)?.value || "");
      const name = getFieldValue("name");
      const email = getFieldValue("email");
      const phone = getFieldValue("phone");
      const city = getFieldValue("city");
      const address = getFieldValue("address");

      return {
        userId: session.user.id,
        name,
        email,
        phone,
        location:
          city || address ? { city, address, country: "USA" } : undefined,
        fields,
        status: "new",
        isFavorite: false,
        isManual: false,
        distributionMethod: "marketplace",
        leadSource: "import",
        shared: false,
        shareNumber: 1,
        exclusive: false,
        unit: 5,
      };
    });

    // Insert leads into database
    const inserted = await Lead.insertMany(leadsToImport);

    // Notify any connected Zaps subscribed to "New Lead" for each imported
    // row — fire-and-forget so a slow/failing webhook never blocks the
    // import response.
    for (const insertedLead of inserted) {
      ZapierTriggerHelper.triggerLeadCreated(
        insertedLead as unknown as Partial<ILead>,
        session.user.id,
      ).catch((err) =>
        console.error("Failed to dispatch Zapier leadCreated trigger:", err),
      );
    }

    return NextResponse.json({
      success: true,
      message: `${leadsToImport.length} leads imported successfully!`,
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return internalError(
      error instanceof Error
        ? `Failed to import leads. ${error.message}`
        : "Failed to import leads.",
    );
  }
}
