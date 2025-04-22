import dbConnect from "@/lib/connectdb";
import { NextRequest, NextResponse } from "next/server";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { leadId, unitCost } = await req.json();

    // Validate unitCost
    if (typeof unitCost !== "number" || unitCost <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid unit cost" },
        { status: 400 }
      );
    }

    // Get the session to retrieve the buyer's email
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find the buyer using the session email
    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return NextResponse.json(
        { success: false, message: "Buyer not found" },
        { status: 404 }
      );
    }

    // Ensure walletBalance is a valid number
    if (typeof buyer.walletUnit !== "number" || isNaN(buyer.walletUnit)) {
      buyer.walletUnit = 0; // Initialize to 0 if invalid
      console.log(
        "Invalid wallet balance for buyer: now initialize to zero",
        buyer.email
      );
    }

    // Check if the buyer has sufficient wallet balance
    if (buyer.walletUnit < unitCost) {
      return NextResponse.json(
        { success: false, message: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    // Find the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // Check if the lead is available
    if (lead.status !== "available") {
      return NextResponse.json(
        { success: false, message: "Lead is not available for purchase" },
        { status: 400 }
      );
    }

    // Check if the lead is already sold out
    if (lead.soldCount >= lead.shareNumber) {
      return NextResponse.json(
        { success: false, message: "Lead is no longer available" },
        { status: 400 }
      );
    }

    // Update the lead
    lead.soldCount += 1;
    if (lead.soldCount >= lead.shareNumber) {
      lead.status = "sold";
    }
    lead.soldTo.push({
      buyerId: buyer._id,
      createdAt: new Date(),
      unit: unitCost,
    }); // Add the buyer's ID to the soldTo array
    await lead.save();

    // Deduct the unitCost from the buyer's wallet balance
    buyer.walletUnit -= unitCost;
    await buyer.save();

    // Create a transaction record
    const transaction = new Transaction({
      type: "lead_purchase",
      userId: buyer._id,
      amount: unitCost,
      previousBalance: buyer.walletUnit,
      currentBalance: buyer.walletUnit - unitCost,
      metadata: {
        leadId: lead._id,
        sellerId: buyer.registeredWith,
        unitsPurchased: unitCost,
      },
      status: "completed",
    });
    await transaction.save();

    return NextResponse.json({
      success: true,
      message: "Lead purchased successfully",
    });
  } catch (error) {
    console.error("Error purchasing lead:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
