// POST /api/invoices - Create invoice
// GET /api/invoices - List invoices
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Invoice } from "@/models/invoice";
import { invoiceEngine, serializeInvoiceForClient } from "@/lib/invoiceEngine";
import { invalidateAllUserSessions } from "@/lib/cachedSession"; // PHASE 3: Cache invalidation
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";
import { ZodError } from "zod";
import { mongoIdParamSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  internalError,
  badRequest,
  forbidden,
  handleValidationError,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (Number.isNaN(page) || Number.isNaN(limit) || page < 1 || limit < 1) {
      return badRequest("page and limit must be positive integers");
    }

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { userId: session.user.id };
    if (status) query.status = status;

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Invoice.countDocuments(query);

    return successResponse({
      // Stored as integer cents (R-31) — map back to the plain-dollar shape
      // the frontend has always consumed.
      invoices: invoices.map((invoice) =>
        serializeInvoiceForClient(
          invoice as unknown as Parameters<typeof serializeInvoiceForClient>[0],
        ),
      ),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return internalError("Failed to fetch invoices");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const body = await req.json();
    const {
      buyerId,
      buyerEmail,
      buyerName,
      lineItems,
      dueDate,
      taxRate,
      discountPercent,
      discount,
      notes,
      termsConditions,
      currency,
      paymentMethod,
    } = body;

    if (buyerId) {
      try {
        mongoIdParamSchema.parse(buyerId);
      } catch (error) {
        if (error instanceof ZodError) {
          return handleValidationError(error);
        }
        return badRequest("Invalid buyerId");
      }
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return badRequest("Line items required");
    }

    if (!dueDate) {
      return badRequest("Due date required");
    }

    // Check subscription limit for invoices
    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "invoicesPerMonth",
      1,
    );
    if (!usageCheck.allowed) {
      return forbidden(
        usageCheck.message || "Invoice limit reached for your subscription",
      );
    }

    const invoice = await invoiceEngine.createInvoice(session.user.id, {
      buyerId,
      buyerEmail,
      buyerName,
      lineItems,
      dueDate: new Date(dueDate),
      taxRate,
      discountPercent,
      discount,
      notes,
      termsConditions,
      currency,
      paymentMethod,
    });

    // PHASE 3: Invalidate user cache after creating invoice
    await invalidateAllUserSessions(session.user.id);

    return successResponse({ invoice: serializeInvoiceForClient(invoice) }, 201);
  } catch (error) {
    console.error("Error creating invoice:", error);
    return internalError("Failed to create invoice");
  }
}
