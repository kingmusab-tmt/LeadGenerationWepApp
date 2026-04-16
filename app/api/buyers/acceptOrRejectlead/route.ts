import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads"; // Import Lead model
import { Buyer } from "@/models/leadbuyers"; // Import Buyer model
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Transaction } from "@/models/transactions";
import { Types } from "mongoose";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

// Define the type for objects in the assignedTo array
interface AssignedBuyer {
  buyerId: string; // Buyer ID
  accepted: boolean;
  rejected: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session?.user?.role !== "buyer") {
      return unauthorized("Authentication required");
    }

    const buyerEmail = session.user.email;
    const buyer = await Buyer.findOne({ email: buyerEmail });
    if (!buyer) {
      return notFound("Buyer");
    }

    const buyerId = buyer._id;
    //("Buyer ID:", buyerId);
    const { leadId, action } = await req.json(); // action: 'accept' or 'reject'

    if (!leadId || !action) {
      return badRequest("Missing required fields");
    }

    if (action !== "accept" && action !== "reject") {
      return badRequest("Invalid action");
    }

    // Connect to the database
    await dbConnect();

    // Fetch the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return notFound("Lead");
    }
    //(lead.assignedTo);

    // Check if the lead is assigned to the buyer
    const isAssigned = lead.assignedTo.some(
      (assigned: AssignedBuyer) =>
        assigned.buyerId && assigned.buyerId.toString() === buyerId.toString(),
    );

    if (!isAssigned) {
      return badRequest("Lead not assigned to this buyer");
    }

    if (action === "accept") {
      // Check if the buyer has sufficient wallet balance
      if (buyer.walletUnit < lead.unit) {
        //("Insufficient credit balance");
        return badRequest("Insufficient credit balance");
      }

      // Deduct the unit price from the buyer's wallet balance
      buyer.walletUnit -= lead.unit;

      // Add to buyer's purchaseHistory
      buyer.purchaseHistory.push({
        leadId: lead._id.toString(),
        date: new Date(),
        amount: lead.unit,
        unit: lead.unit,
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
        unitPaid: lead.unit,
        purchaseType: "assigned",
      });

      await buyer.save();

      // Fetch seller details for transaction record
      const seller = await User.findById(buyer.registeredWith);

      // Create a transaction record
      const transaction = new Transaction({
        type: "lead_purchase",
        userId: buyer._id,
        amount: lead.unit,
        previousBalance: buyer.walletUnit + lead.unit, // Previous balance before deduction
        currentBalance: buyer.walletUnit, // Current balance after deduction
        metadata: {
          leadId: lead._id,
          sellerId: buyer.registeredWith,
          sellerName: seller?.name || "Unknown",
          sellerEmail: seller?.email || "N/A",
          buyerId: buyer._id,
          buyerName: buyer.name || "Unknown",
          buyerEmail: buyer.email || "N/A",
          unitsPurchased: lead.unit,
        },
        status: "completed",
      });
      await transaction.save();

      // Update lead status to 'sold' and add buyer to soldTo
      lead.soldTo.push({
        buyerId: buyer._id,
        createdAt: new Date(),
        unit: lead.unit,
      });
      // Set accepted to true for the assigned buyer
      const assignedBuyer = lead.assignedTo.find(
        (assigned: AssignedBuyer) =>
          assigned.buyerId &&
          assigned.buyerId.toString() === buyerId.toString(),
      );
      if (assignedBuyer) {
        assignedBuyer.accepted = true;
        assignedBuyer.rejected = false;
      }
      lead.status = "sold";
      await lead.save();

      return NextResponse.json(
        { message: "Lead accepted and purchased successfully" },
        { status: 200 },
      );
    } else if (action === "reject") {
      // Update lead status to 'available' and remove buyer from assignedTo
      lead.status = "available";
      // Set rejected to true for the assigned buyer before removing or updating
      const assignedBuyer = lead.assignedTo.find(
        (assigned: AssignedBuyer) =>
          assigned.buyerId &&
          assigned.buyerId.toString() === buyerId.toString(),
      );
      if (assignedBuyer) {
        assignedBuyer.rejected = true;
        assignedBuyer.accepted = false;
      }
      lead.assignedTo = lead.assignedTo.filter(
        (assigned: AssignedBuyer) =>
          assigned.buyerId &&
          assigned.buyerId.toString() !== buyerId.toString(),
      );
      await lead.save();

      return NextResponse.json({ message: "Lead rejected" }, { status: 200 });
    } else {
      return badRequest("Invalid action");
    }
  } catch (error) {
    console.error(error);
    return internalError("Internal server error");
  }
}
