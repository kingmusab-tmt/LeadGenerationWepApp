// POST /api/invoices - Create invoice
// GET /api/invoices - List invoices
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Invoice } from "@/models/invoice";
import { invoiceEngine } from "@/lib/invoiceEngine";
import { invalidateAllUserSessions } from "@/lib/cachedSession"; // PHASE 3: Cache invalidation
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { userId: session.user.id };
    if (status) query.status = status;

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Invoice.countDocuments(query);

    return NextResponse.json(
      {
        invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "Line items required" },
        { status: 400 },
      );
    }

    if (!dueDate) {
      return NextResponse.json({ error: "Due date required" }, { status: 400 });
    }

    // Check subscription limit for invoices
    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "invoicesPerMonth",
      1,
    );
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error:
            usageCheck.message || "Invoice limit reached for your subscription",
        },
        { status: 403 },
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

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 },
    );
  }
}
