import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

/**
 * GET /api/leads/available
 *
 * Returns available leads that an independent buyer can see:
 * - Leads with status "available"
 * - Non-exclusive leads (shared or marketplace)
 *
 * For pre-registered buyers (registeredWith set), they can also see
 * leads specifically assigned or made available by their seller.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "buyer") {
    return unauthorized("Authentication required");
  }

  try {
    await dbConnect();

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return notFound("Buyer", "Buyer profile not found");
    }

    // Build query for available leads
    const query: Record<string, unknown> = {
      status: "available",
      exclusive: false, // Only non-exclusive leads for independent buyers
    };

    // If buyer is pre-registered with a seller, also include seller-specific leads
    if (buyer.registeredWith) {
      // TODO: Add logic for seller-specific leads when registeredWith is set
      // For now, just show public leads
    }

    const leads = await Lead.find(query)
      .select("-soldTo -assignedTo") // Hide transaction details
      .limit(100)
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, data: { leads, total: leads.length } },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Available Leads API] Error:", error);
    return internalError("Failed to fetch available leads");
  }
}
