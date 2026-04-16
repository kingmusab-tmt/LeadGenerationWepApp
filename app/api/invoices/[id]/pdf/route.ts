// GET /api/invoices/[id]/pdf - Download invoice as PDF
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Invoice } from "@/models/invoice";
import { invoiceEngine } from "@/lib/invoiceEngine";
import { ZodError } from "zod";
import { mongoIdParamSchema } from "@/lib/validation/schemas";
import {
  unauthorized,
  notFound,
  forbidden,
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

    const pdfBuffer = await invoiceEngine.generatePDF(id);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return internalError("Failed to generate PDF");
  }
}
