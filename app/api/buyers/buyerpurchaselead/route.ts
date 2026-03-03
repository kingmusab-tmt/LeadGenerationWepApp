import dbConnect from "@/lib/connectdb";
import { NextRequest, NextResponse } from "next/server";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Types } from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { leadId, unitCost } = await req.json();

    // Validate unitCost
    if (typeof unitCost !== "number" || unitCost <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid unit cost" },
        { status: 400 },
      );
    }

    // Get the session to retrieve the buyer's email
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "buyer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // Find the buyer using the session email
    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return NextResponse.json(
        { success: false, message: "Buyer not found" },
        { status: 404 },
      );
    }

    // Ensure walletBalance is a valid number
    if (typeof buyer.walletUnit !== "number" || isNaN(buyer.walletUnit)) {
      buyer.walletUnit = 0; // Initialize to 0 if invalid
    }

    // Check if the buyer has sufficient wallet balance
    if (buyer.walletUnit < unitCost) {
      return NextResponse.json(
        { success: false, message: "Insufficient wallet balance" },
        { status: 400 },
      );
    }

    // Find the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 },
      );
    }

    // Check if the lead is available
    if (lead.status !== "available") {
      return NextResponse.json(
        { success: false, message: "Lead is not available for purchase" },
        { status: 400 },
      );
    }

    // Check if the lead is already sold out
    if (lead.soldCount >= lead.shareNumber) {
      return NextResponse.json(
        { success: false, message: "Lead is no longer available" },
        { status: 400 },
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

    // Add to buyer's purchaseHistory
    buyer.purchaseHistory.push({
      leadId: lead._id.toString(),
      date: new Date(),
      amount: unitCost,
      unit: unitCost,
    });

    // Add leadId to buyer's purchasedLeads array
    const leadIdString = lead._id.toString();
    if (!buyer.purchasedLeads.some((id) => id.toString() === leadIdString)) {
      buyer.purchasedLeads.push(new Types.ObjectId(lead._id));
    }

    // Copy complete lead data to buyer's purchasedLeadsData
    buyer.purchasedLeadsData = buyer.purchasedLeadsData || [];
    buyer.purchasedLeadsData.push({
      leadId: lead._id.toString(),
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      industry: lead.industry || "",
      location: {
        city: lead.location?.city || "",
        state: lead.location?.state || "",
        country: lead.location?.country || "USA",
        zipCode: lead.location?.zipCode || "",
        address: lead.location?.address || "",
      },
      fields: lead.fields || [],
      aiQualityScore: lead.aiQualityScore,
      qualityLevel: lead.qualityLevel,
      purchasedAt: new Date(),
      unitPaid: unitCost,
      purchaseType: "marketplace",
    });

    await buyer.save();

    // Fetch seller details for transaction record
    const seller = await User.findById(buyer.registeredWith);

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
        sellerName: seller?.name || "Unknown",
        sellerEmail: seller?.email || "N/A",
        buyerId: buyer._id,
        buyerName: buyer.name || "Unknown",
        buyerEmail: buyer.email || "N/A",
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
      { status: 500 },
    );
  }
}
