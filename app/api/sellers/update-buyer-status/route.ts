import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models/userModel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * POST /api/sellers/update-buyer-status
 * Checks all buyers with status "new" registered with the seller
 * and updates their status to "active" if they have at least one entry in purchaseHistory.
 *
 * Optional query param: buyerId - to check and update a specific buyer only
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate the seller
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const seller = await User.findOne({ email: session.user.email });

    if (!seller || seller.role !== "seller") {
      return NextResponse.json(
        { success: false, message: "Only sellers can perform this action" },
        { status: 403 },
      );
    }

    // Check if a specific buyerId was provided
    const { searchParams } = new URL(req.url);
    const specificBuyerId = searchParams.get("buyerId");

    // Build query to find "new" buyers registered with this seller
    const buyerQuery: Record<string, unknown> = {
      registeredWith: seller._id,
      status: "new",
    };

    // If a specific buyer ID is provided, add it to the query
    if (specificBuyerId) {
      buyerQuery._id = specificBuyerId;
    }

    // Find all buyers with status "new" registered with this seller
    const newBuyers = await Buyer.find(buyerQuery);

    if (newBuyers.length === 0) {
      return NextResponse.json({
        success: true,
        message: specificBuyerId
          ? "No buyer found with status 'new' for the given ID"
          : "No buyers with status 'new' found",
        updatedCount: 0,
        updatedBuyers: [],
      });
    }

    // Filter buyers who have at least one entry in their purchaseHistory
    const buyersToUpdate = newBuyers.filter(
      (buyer) => buyer.purchaseHistory && buyer.purchaseHistory.length > 0,
    );

    const updatedBuyers: {
      id: string;
      name: string;
      email: string;
      purchaseCount: number;
    }[] = [];

    for (const buyer of buyersToUpdate) {
      buyer.status = "active";
      await buyer.save();
      updatedBuyers.push({
        id: buyer._id.toString(),
        name: buyer.name,
        email: buyer.email,
        purchaseCount: buyer.purchaseHistory.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedBuyers.length} buyer(s) from 'new' to 'active'`,
      updatedCount: updatedBuyers.length,
      updatedBuyers,
      checkedCount: newBuyers.length,
    });
  } catch (error) {
    console.error("Error updating buyer status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update buyer status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sellers/update-buyer-status
 * Checks buyers with status "new" and returns which ones would be updated
 * without actually updating them (dry run / preview).
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate the seller
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const seller = await User.findOne({ email: session.user.email });

    if (!seller || seller.role !== "seller") {
      return NextResponse.json(
        { success: false, message: "Only sellers can perform this action" },
        { status: 403 },
      );
    }

    // Find all buyers with status "new" registered with this seller
    const newBuyers = await Buyer.find({
      registeredWith: seller._id,
      status: "new",
    }).select("_id name email company purchaseHistory");

    if (newBuyers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No buyers with status 'new' found",
        newBuyersCount: 0,
        eligibleForActivation: [],
        notEligible: [],
      });
    }

    const eligibleForActivation: {
      id: string;
      name: string;
      email: string;
      company: string;
      purchaseCount: number;
      firstPurchase: Date | null;
      lastPurchase: Date | null;
    }[] = [];

    const notEligible: {
      id: string;
      name: string;
      email: string;
      company: string;
      reason: string;
    }[] = [];

    for (const buyer of newBuyers) {
      if (buyer.purchaseHistory && buyer.purchaseHistory.length > 0) {
        // Sort purchase history by date to get first and last purchase
        const sortedHistory = [...buyer.purchaseHistory].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        eligibleForActivation.push({
          id: buyer._id.toString(),
          name: buyer.name,
          email: buyer.email,
          company: buyer.company,
          purchaseCount: buyer.purchaseHistory.length,
          firstPurchase: sortedHistory[0]?.date || null,
          lastPurchase: sortedHistory[sortedHistory.length - 1]?.date || null,
        });
      } else {
        notEligible.push({
          id: buyer._id.toString(),
          name: buyer.name,
          email: buyer.email,
          company: buyer.company,
          reason: "No lead purchases found in purchaseHistory",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found ${eligibleForActivation.length} buyer(s) eligible for activation`,
      newBuyersCount: newBuyers.length,
      eligibleForActivation,
      notEligible,
    });
  } catch (error) {
    console.error("Error checking buyer status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check buyer status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
