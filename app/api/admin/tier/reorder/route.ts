// Description: This API route handles the reordering of tiers in bulk.
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";
// Update tier order (bulk update)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return unauthorized("Authentication required");
    }

    const { tiers: updatedTiers } = await req.json();

    if (!Array.isArray(updatedTiers)) {
      return badRequest("Invalid data format");
    }

    await dbConnect();

    const bulkOps = updatedTiers.map((tier) => ({
      updateOne: {
        filter: { _id: tier._id },
        update: { $set: { order: tier.order } },
      },
    }));

    await Tier.bulkWrite(bulkOps);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tiers:", error);
    return internalError("Failed to update tiers");
  }
}
