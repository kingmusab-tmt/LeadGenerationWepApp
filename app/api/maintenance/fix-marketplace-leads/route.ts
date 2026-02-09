import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * POST /api/maintenance/fix-marketplace-leads
 *
 * Fixes leads that are marked as available but missing the distributionMethod: "marketplace" field.
 * This ensures they show up in the marketplace for buyers.
 *
 * Only accessible by sellers/admins for their own leads.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // Find leads that are available but don't have distributionMethod set to "marketplace"
    const leadsToFix = await Lead.find({
      userId,
      status: "available",
      distributionMethod: { $exists: false },
    });

    if (leadsToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads need fixing",
        fixedCount: 0,
        leadIds: [],
      });
    }

    // Update all these leads to have distributionMethod: "marketplace"
    const result = await Lead.updateMany(
      {
        userId,
        status: "available",
        distributionMethod: { $exists: false },
      },
      {
        $set: { distributionMethod: "marketplace" },
      },
    );

    const fixedLeads = leadsToFix.map((lead) => lead._id.toString());

    console.log(
      `✅ Fixed ${result.modifiedCount} marketplace leads for user ${userId}`,
      fixedLeads,
    );

    return NextResponse.json({
      success: true,
      message: `Fixed ${result.modifiedCount} lead(s) - they now show in marketplace`,
      fixedCount: result.modifiedCount,
      leadIds: fixedLeads,
    });
  } catch (error) {
    console.error("Error fixing marketplace leads:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fix marketplace leads",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/maintenance/fix-marketplace-leads
 *
 * Check which leads are affected (available but missing distributionMethod).
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // Find affected leads
    const affectedLeads = await Lead.find({
      userId,
      status: "available",
      distributionMethod: { $exists: false },
    }).select("_id name email leadSource createdAt");

    return NextResponse.json({
      success: true,
      message: `Found ${affectedLeads.length} lead(s) that need fixing`,
      affectedCount: affectedLeads.length,
      leads: affectedLeads.map((lead) => ({
        id: lead._id.toString(),
        name: lead.name || "Unknown",
        email: lead.email || "No email",
        source: lead.leadSource,
        createdAt: lead.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error checking marketplace leads:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check marketplace leads",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
