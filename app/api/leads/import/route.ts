import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Papa from "papaparse";

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
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const [headers, ...rows] = results.data;

    // Prepare leads for import
    const leadsToImport = rows.map((row) => {
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
        fields: fields,
        status: "new",
        isFavorite: false,
        isManual: false,
        distributionMethod: "marketplace",
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
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to convert string to Title Case
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
