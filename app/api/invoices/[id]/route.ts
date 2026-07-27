// GET /api/invoices/[id] - Get invoice details
// PUT /api/invoices/[id] - Update invoice
// DELETE /api/invoices/[id] - Delete invoice
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Invoice } from "@/models/invoice";
import { invoiceEngine, serializeInvoiceForClient } from "@/lib/invoiceEngine";
import { ZodError } from "zod";
import { mongoIdParamSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  badRequest,
  handleValidationError,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
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

    await dbConnect();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return notFound("Invoice");
    }

    // Check ownership
    if (invoice.userId.toString() !== session.user.id) {
      return forbidden("You do not have access to this invoice");
    }

    return successResponse({ invoice: serializeInvoiceForClient(invoice) });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return internalError("Failed to fetch invoice");
  }
}

export async function PUT(
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

    await dbConnect();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return notFound("Invoice");
    }

    // Check ownership
    if (invoice.userId.toString() !== session.user.id) {
      return forbidden("You do not have access to this invoice");
    }

    // Cannot update if invoice is sent or paid
    if (["sent", "paid"].includes(invoice.status)) {
      return badRequest(`Cannot update invoice with status: ${invoice.status}`);
    }

    const body = await req.json();
    const updatedInvoice = await invoiceEngine.updateInvoice(id, body);
    if (!updatedInvoice) {
      return notFound("Invoice");
    }

    return successResponse({ invoice: serializeInvoiceForClient(updatedInvoice) });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return internalError("Failed to update invoice");
  }
}

export async function DELETE(
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

    await dbConnect();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return notFound("Invoice");
    }

    // Check ownership
    if (invoice.userId.toString() !== session.user.id) {
      return forbidden("You do not have access to this invoice");
    }

    // Can only delete draft invoices
    if (invoice.status !== "draft") {
      return badRequest("Can only delete draft invoices");
    }

    await invoiceEngine.deleteInvoice(id);

    return successResponse({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return internalError("Failed to delete invoice");
  }
}
