// POST /api/invoices/[id]/actions - Send invoice, mark as paid, etc
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Invoice } from "@/models/invoice";
import {
  fromStoredLineItem,
  invoiceEngine,
  serializeInvoiceForClient,
} from "@/lib/invoiceEngine";
import { fromCents } from "@/lib/money";
import { ZodError } from "zod";
import { mongoIdParamSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  notFound,
  forbidden,
  badRequest,
  internalError,
  handleValidationError,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    try {
      mongoIdParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid invoice id");
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await dbConnect();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return notFound("Invoice");
    }

    // Check ownership
    if (invoice.userId.toString() !== session.user.id) {
      return forbidden("You do not have access to this invoice");
    }

    // ==================== SEND ====================
    if (action === "send") {
      const result = await invoiceEngine.sendInvoice(id);

      return successResponse(result);
    }

    // ==================== MARK AS PAID ====================
    if (action === "mark-paid") {
      const body = await req.json();
      const { paymentMethod, paymentDate } = body;

      if (!paymentMethod) {
        return badRequest("Payment method required");
      }

      const updatedInvoice = await invoiceEngine.markAsPaid(
        id,
        paymentMethod,
        paymentDate ? new Date(paymentDate) : undefined,
      );

      if (!updatedInvoice) {
        return notFound("Invoice");
      }

      return successResponse({
        message: "Invoice marked as paid",
        invoice: serializeInvoiceForClient(updatedInvoice),
      });
    }

    // ==================== SEND REMINDER ====================
    if (action === "send-reminder") {
      if (invoice.status === "paid") {
        return badRequest("Cannot send reminder for paid invoice");
      }

      // In production, this would send an email
      await Invoice.findByIdAndUpdate(id, {
        remindersSent: invoice.remindersSent + 1,
        lastReminderDate: new Date(),
      });

      return successResponse({ message: "Reminder sent successfully" });
    }

    // ==================== DUPLICATE ====================
    if (action === "duplicate") {
      // invoice.lineItems/discountCents are the stored (cents) shape;
      // createInvoice's payload is dollar-denominated like every other
      // caller, so convert back before re-submitting.
      const newInvoice = await invoiceEngine.createInvoice(session.user.id, {
        buyerId: invoice.buyerId?.toString(),
        buyerEmail: invoice.buyerEmail,
        buyerName: invoice.buyerName,
        lineItems: invoice.lineItems.map(fromStoredLineItem),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        taxRate: invoice.taxRate,
        discount:
          invoice.discountCents !== undefined
            ? fromCents(invoice.discountCents)
            : undefined,
        discountPercent: invoice.discountPercent,
        notes: invoice.notes,
        termsConditions: invoice.termsConditions,
        currency: invoice.currency,
        paymentMethod: invoice.paymentMethod,
      });

      return successResponse(
        {
          message: "Invoice duplicated",
          invoice: serializeInvoiceForClient(newInvoice),
        },
        201,
      );
    }

    return badRequest("Invalid action");
  } catch (error) {
    console.error("Error processing invoice action:", error);
    return internalError("Failed to process action");
  }
}
