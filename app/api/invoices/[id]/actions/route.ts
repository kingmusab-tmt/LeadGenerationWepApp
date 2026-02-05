// POST /api/invoices/[id]/actions - Send invoice, mark as paid, etc
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Invoice } from "@/models/invoice";
import { invoiceEngine } from "@/lib/invoiceEngine";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await dbConnect();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check ownership
    if (invoice.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ==================== SEND ====================
    if (action === "send") {
      const result = await invoiceEngine.sendInvoice(id);

      return NextResponse.json(result, { status: 200 });
    }

    // ==================== MARK AS PAID ====================
    if (action === "mark-paid") {
      const body = await req.json();
      const { paymentMethod, paymentDate } = body;

      if (!paymentMethod) {
        return NextResponse.json(
          { error: "Payment method required" },
          { status: 400 }
        );
      }

      const updatedInvoice = await invoiceEngine.markAsPaid(
        id,
        paymentMethod,
        paymentDate ? new Date(paymentDate) : undefined
      );

      return NextResponse.json(
        { message: "Invoice marked as paid", invoice: updatedInvoice },
        { status: 200 }
      );
    }

    // ==================== SEND REMINDER ====================
    if (action === "send-reminder") {
      if (invoice.status === "paid") {
        return NextResponse.json(
          { error: "Cannot send reminder for paid invoice" },
          { status: 400 }
        );
      }

      // In production, this would send an email
      await Invoice.findByIdAndUpdate(id, {
        remindersSent: invoice.remindersSent + 1,
        lastReminderDate: new Date(),
      });

      return NextResponse.json(
        { message: "Reminder sent successfully" },
        { status: 200 }
      );
    }

    // ==================== DUPLICATE ====================
    if (action === "duplicate") {
      const newInvoice = await invoiceEngine.createInvoice(session.user.id, {
        buyerId: invoice.buyerId?.toString(),
        buyerEmail: invoice.buyerEmail,
        buyerName: invoice.buyerName,
        lineItems: invoice.lineItems,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        taxRate: invoice.taxRate,
        discount: invoice.discount,
        discountPercent: invoice.discountPercent,
        notes: invoice.notes,
        termsConditions: invoice.termsConditions,
        currency: invoice.currency,
        paymentMethod: invoice.paymentMethod,
      });

      return NextResponse.json(
        { message: "Invoice duplicated", invoice: newInvoice },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing invoice action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
