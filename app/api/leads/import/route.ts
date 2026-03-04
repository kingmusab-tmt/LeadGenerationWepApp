import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Papa from "papaparse";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";

interface Field {
  id: string;
  label: string;
  value: any;
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 },
      );
    }

    // Read the file content
    const fileContent = await file.text();

    // Parse CSV
    const results = Papa.parse<string[]>(fileContent, {
      skipEmptyLines: true,
    });

    if (!results.data || results.data.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV must have at least a header row and one data row",
        },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          success: false,
          message: `Lead limit would be exceeded. You can import ${remaining} more leads (current: ${usageCheck.currentUsage}/${usageCheck.limit}). Please upgrade your plan.`,
        },
        { status: 403 },
      );
    }

    // Prepare leads for import
    const leadsToImport = rows.map((row) => {
      // Create a map of header to value for easy lookup
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header.toLowerCase().trim()] = row[index] || "";
      });

      // Extract standard fields from CSV columns
      const name =
        rowData["name"] || rowData["full name"] || rowData["fullname"] || "";
      const email =
        rowData["email"] || rowData["e-mail"] || rowData["email address"] || "";
      const phone =
        rowData["phone"] ||
        rowData["mobile"] ||
        rowData["phone number"] ||
        rowData["contact"] ||
        "";
      const company =
        rowData["company"] ||
        rowData["company name"] ||
        rowData["organization"] ||
        "";
      const industry = rowData["industry"] || rowData["sector"] || "";

      // Location fields
      const city = rowData["city"] || "";
      const state = rowData["state"] || rowData["province"] || "";
      const country = rowData["country"] || "USA";
      const zipCode =
        rowData["zip code"] ||
        rowData["zipcode"] ||
        rowData["zip"] ||
        rowData["postal code"] ||
        "";
      const address = rowData["address"] || rowData["street address"] || "";

      // Build fields array for all columns
      const fields: Field[] = headers.map((header, index) => ({
        id: header.toLowerCase().replace(/\s+/g, "_"),
        label:
          header.trim() === ""
            ? `Field ${index + 1}`
            : toTitleCase(header.trim()),
        value: row[index] || "",
      }));

      return {
        userId: session.user.id,
        name,
        email,
        phone,
        company,
        industry,
        location: {
          city,
          state,
          country,
          zipCode,
          address,
        },
        fields: fields,
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
    await Lead.insertMany(leadsToImport);

    return NextResponse.json({
      success: true,
      message: `${leadsToImport.length} leads imported successfully!`,
    });
  } catch (error: any) {
    console.error("Error importing leads:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to import leads.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper function to convert string to Title Case
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
