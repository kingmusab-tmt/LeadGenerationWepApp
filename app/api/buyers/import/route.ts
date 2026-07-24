import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Papa from "papaparse";
import { recordAuditLog } from "@/lib/auditLog";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { withErrorHandler } from "@/lib/api/async-handler";
import { badRequest, forbidden, unauthorized } from "@/lib/api/error-handler";

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB
const MAX_ROWS = 5000;

export const POST = withErrorHandler(async (request: NextRequest) => {
  await dbConnect();

  // Get user session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized("Authentication required");
  }
  // Only "seller" — previously any authenticated role (including a plain
  // "buyer" or "user" account) could hit this endpoint and insert unlimited
  // Buyer documents under their own id. "admin" isn't included either:
  // sellerId below always resolves to session.user.id, so an admin caller
  // would import buyers registered to their own admin account rather than
  // any real seller's — a non-functional path, not a working
  // admin-on-behalf-of-seller feature.
  if (session.user.role !== "seller") {
    return forbidden("Only sellers can import buyers");
  }

  const rateLimited = await checkSimpleRateLimit(request, {
    scope: "buyers:import",
    limit: 5,
    windowMs: 10 * 60 * 1000,
    actorId: session.user.id,
  });
  if (rateLimited) return rateLimited;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return badRequest("No file provided");
  }
  if (
    file.type &&
    !["text/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type)
  ) {
    return badRequest("File must be a CSV");
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return badRequest("File must be a .csv file");
  }
  if (file.size > MAX_FILE_BYTES) {
    return badRequest(
      `File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is ${MAX_FILE_BYTES / 1024 / 1024}MB.`,
    );
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

  if (rows.length > MAX_ROWS) {
    return badRequest(
      `CSV has ${rows.length} rows, which exceeds the ${MAX_ROWS}-row import limit. Please split it into smaller files.`,
    );
  }

  const sellerId = session.user.id;

  // Live buyer count against the seller's tier limit, checked against the
  // full batch size up front — the previous check only verified the account
  // wasn't already exactly at/over its cap, then charged the whole batch
  // regardless, so one import could blow straight through the limit.
  const seller = await User.findById(sellerId);
  const buyerLimit = seller?.subscription?.subscriptionLimits?.buyers ?? 0;
  if (buyerLimit > 0) {
    const currentBuyerCount = await Buyer.countDocuments({
      registeredWith: sellerId,
    });
    const remaining = buyerLimit - currentBuyerCount;
    if (remaining <= 0) {
      return forbidden(
        `Buyer limit reached (${currentBuyerCount}/${buyerLimit}). Please upgrade your plan.`,
      );
    }
    if (rows.length > remaining) {
      return forbidden(
        `This import has ${rows.length} rows, but your plan only has room for ${remaining} more buyer(s) (${currentBuyerCount}/${buyerLimit}). Please upgrade your plan or import a smaller file.`,
      );
    }
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
    // "active" is purchase-gated (see /api/buyers PUT) — an imported row can
    // never have real purchase history in this app, so it can't legitimately
    // start active regardless of what the CSV's status column says.
    const rawStatus = (rowData["status"] || "new").toLowerCase();
    const status: "new" | "active" | "inactive" | "suspended" = [
      "new",
      "inactive",
      "suspended",
    ].includes(rawStatus)
      ? (rawStatus as "new" | "inactive" | "suspended")
      : "new";
    const rawDistribution = rowData["preferred distribution"] ||
      rowData["distribution"] ||
      "Automatic";
    const preferredDistribution: "Automatic" | "Manual" | "Both" = [
      "Automatic",
      "Manual",
      "Both",
    ].includes(rawDistribution)
      ? (rawDistribution as "Automatic" | "Manual" | "Both")
      : "Automatic";
    const location = rowData["location"] || "";
    const industries = rowData["industries"]
      ? rowData["industries"]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    return {
      registeredWith: sellerId,
      name,
      email,
      phone,
      company,
      businessDescription,
      priority: Math.min(10, Math.max(1, priority)),
      maxLeadsPerDay,
      status,
      preferredDistribution,
      leadPreferences: {
        location: location ? [location] : [],
        industries,
      },
      // preferredZones — not leadPreferences.location — is what the lead-
      // matching engine actually reads; keep it in sync the same way POST
      // (single buyer creation) already does.
      preferredZones: location ? [{ city: location }] : [],
      // status can never be "active" here (see above), so this is always
      // false for an import — kept as a field for schema consistency with
      // the other buyer-creation paths.
      isActive: false,
      walletUnit: 0,
      walletBalance: 0,
      currentLeads: 0,
      currentLeadsToday: 0,
      qualificationScoreMinimum: 0,
      notificationPreferences: ["Email", "In-App Notification"],
    };
  });

  // Filter out rows with missing required fields BEFORE counting anything
  // toward the seller's tier usage — the old code charged usage for the raw
  // row count, including rows that were never actually inserted.
  const validBuyers = buyersToImport.filter(
    (buyer) => buyer.name && buyer.email,
  );
  const skippedForMissingFields = buyersToImport.length - validBuyers.length;

  if (validBuyers.length === 0) {
    return badRequest(
      "No valid buyers to import. Each row must have at least a Name and Email.",
    );
  }

  // Unordered insert so one bad row (e.g. a duplicate email) doesn't abort
  // the whole batch — Mongo attempts every document and reports exactly
  // which ones failed, instead of an all-or-nothing ordered insert.
  let insertedCount = 0;
  let duplicateOrInvalidCount = 0;
  try {
    const inserted = await Buyer.insertMany(validBuyers, { ordered: false });
    insertedCount = inserted.length;
  } catch (error) {
    const bulkError = error as {
      insertedDocs?: unknown[];
      writeErrors?: unknown[];
    };
    insertedCount = bulkError.insertedDocs?.length ?? 0;
    duplicateOrInvalidCount = bulkError.writeErrors?.length ?? 0;
    if (insertedCount === 0) {
      return badRequest(
        "None of the rows could be imported — likely all duplicate emails or invalid data.",
      );
    }
  }

  // Sync the usage counter to the live count (see /api/buyers POST for why
  // this is a snapshot-sync rather than an increment).
  const liveBuyerCount = await Buyer.countDocuments({
    registeredWith: sellerId,
  });
  await User.findByIdAndUpdate(sellerId, {
    $set: { "subscription.subscriptionUsage.buyers": liveBuyerCount },
  });

  await recordAuditLog({
    actor: { email: session.user.email, role: session.user.role },
    action: "buyer.import",
    targetType: "Buyer",
    summary: `Imported ${insertedCount} buyer(s) from CSV${duplicateOrInvalidCount ? ` (${duplicateOrInvalidCount} rejected)` : ""}`,
    metadata: {
      insertedCount,
      duplicateOrInvalidCount,
      skippedForMissingFields,
    },
    req: request,
  });

  const totalSkipped = skippedForMissingFields + duplicateOrInvalidCount;
  const messageParts = [`${insertedCount} buyers imported successfully!`];
  if (skippedForMissingFields > 0) {
    messageParts.push(`${skippedForMissingFields} skipped (missing name/email)`);
  }
  if (duplicateOrInvalidCount > 0) {
    messageParts.push(`${duplicateOrInvalidCount} rejected (duplicate or invalid)`);
  }

  return NextResponse.json({
    success: true,
    message: messageParts.join(" — "),
    imported: insertedCount,
    skipped: totalSkipped,
  });
});
