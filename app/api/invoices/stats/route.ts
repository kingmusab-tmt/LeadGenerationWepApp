// GET /api/invoices/stats - Get invoice statistics and analytics
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { invoiceEngine } from "@/lib/invoiceEngine";
import dbConnect from "@/lib/connectdb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const stats = await invoiceEngine.getInvoiceStats(session.user.id);
    const overdueInvoices = await invoiceEngine.getOverdueInvoices(
      session.user.id
    );

    return NextResponse.json(
      {
        stats,
        overdueInvoices,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching invoice stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
