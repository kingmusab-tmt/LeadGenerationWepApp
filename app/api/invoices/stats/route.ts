// GET /api/invoices/stats - Get invoice statistics and analytics

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { invoiceEngine } from "@/lib/invoiceEngine";
import dbConnect from "@/lib/connectdb";
import {
  successResponse,
  unauthorized,
  internalError,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const stats = await invoiceEngine.getInvoiceStats(session.user.id);
    const overdueInvoices = await invoiceEngine.getOverdueInvoices(
      session.user.id,
    );

    return successResponse({
      stats,
      overdueInvoices,
    });
  } catch (error) {
    console.error("Error fetching invoice stats:", error);
    return internalError("Failed to fetch stats");
  }
}
