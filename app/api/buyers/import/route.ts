import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Papa from "papaparse";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";
import {
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
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

    // Check subscription limit for buyers
    const importCount = rows.length;
    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "buyers",
      importCount,
    );
    if (!usageCheck.allowed) {
      const remaining = Math.max(0, usageCheck.limit - usageCheck.currentUsage);
      return forbidden(
        `Buyer limit would be exceeded. You can import ${remaining} more buyers (current: ${usageCheck.currentUsage}/${usageCheck.limit}). Please upgrade your plan.`,
      );
    }

    // Prepare buyers for import
    const buyersToImport = rows.map((row) => {
      // Create a map of header to value for easy lookup
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header.toLowerCase().trim()] = row[index] || "";
      });

      // Extract fields from CSV
      const name = rowData["name"] || rowData["full name"] || "";
      const email = rowData["email"] || rowData["e-mail"] || "";
      const phone =
        rowData["phone"] || rowData["mobile"] || rowData["phone number"] || "";
      const company = rowData["company"] || rowData["company name"] || "";
      const businessDescription =
        rowData["business description"] || rowData["description"] || "";
      const priority = parseInt(rowData["priority"]) || 5;
      const maxLeadsPerDay =
        parseInt(rowData["max leads per day"] || rowData["maxleadsperday"]) ||
        10;
      const status = (rowData["status"] || "new").toLowerCase() as
        | "new"
        | "active"
        | "inactive"
        | "suspended";
      const preferredDistribution = (rowData["preferred distribution"] ||
        rowData["distribution"] ||
        "Automatic") as "Automatic" | "Manual" | "Both";
      const location = rowData["location"] || "";
      const industries = rowData["industries"]
        ? rowData["industries"]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      return {
        registeredWith: session.user.id,
        name,
        email,
        phone,
        company,
        businessDescription,
        priority: Math.min(10, Math.max(1, priority)),
        maxLeadsPerDay,
        status: ["new", "active", "inactive", "suspended"].includes(status)
          ? status
          : "new",
        preferredDistribution: ["Automatic", "Manual", "Both"].includes(
          preferredDistribution,
        )
          ? preferredDistribution
          : "Automatic",
        leadPreferences: {
          location: location ? [location] : [],
          industries,
        },
        isActive: status === "active",
        walletUnit: 0,
        walletBalance: 0,
        currentLeads: 0,
        currentLeadsToday: 0,
        qualificationScoreMinimum: 0,
        notificationPreferences: ["Email", "In-App Notification"],
      };
    });

    // Filter out buyers with missing required fields
    const validBuyers = buyersToImport.filter(
      (buyer) => buyer.name && buyer.email,
    );

    if (validBuyers.length === 0) {
      return badRequest(
        "No valid buyers to import. Each row must have at least a Name and Email.",
      );
    }

    // Insert buyers into database
    await Buyer.insertMany(validBuyers);

    const skipped = buyersToImport.length - validBuyers.length;
    const message =
      skipped > 0
        ? `${validBuyers.length} buyers imported successfully! (${skipped} skipped due to missing name/email)`
        : `${validBuyers.length} buyers imported successfully!`;

    return NextResponse.json({
      success: true,
      message,
      imported: validBuyers.length,
      skipped,
    });
  } catch (error) {
    console.error("Error importing buyers:", error);
    return internalError(
      error instanceof Error
        ? `Failed to import buyers. ${error.message}`
        : "Failed to import buyers.",
    );
  }
}
