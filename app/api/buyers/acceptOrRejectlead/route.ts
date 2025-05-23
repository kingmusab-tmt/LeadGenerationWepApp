import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads"; // Import Lead model
import { Buyer } from "@/models/leadbuyers"; // Import Buyer model
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Transaction } from "@/models/transactions";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); // Unauthorized
    }

    const buyerEmail = session.user.email;
    const buyer = await Buyer.findOne({ email: buyerEmail });
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 }); // Buyer not found
    }

    const buyerId = buyer._id;
    console.log("Buyer ID:", buyerId);
    const { leadId, action } = await req.json(); // action: 'accept' or 'reject'

    if (!leadId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Connect to the database
    await dbConnect();

    // Fetch the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    console.log(lead.assignedTo);

    // Check if the lead is assigned to the buyer
    const isAssigned = lead.assignedTo.some(
      (assigned: AssignedBuyer) =>
        assigned.buyerId && assigned.buyerId.toString() === buyerId.toString()
    );

    if (!isAssigned) {
      return NextResponse.json(
        { error: "Lead not assigned to this buyer" },
        { status: 400 }
      );
    }

    if (action === "accept") {
      // Check if the buyer has sufficient wallet balance
      if (buyer.walletUnit < lead.unit) {
        console.log("Insufficient credit balance");
        return NextResponse.json(
          { error: "Insufficient credit balance" },
          { status: 400 }
        );
      }

      // Deduct the unit price from the buyer's wallet balance
      buyer.walletUnit -= lead.unit;
      await buyer.save();

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
          assigned.buyerId && assigned.buyerId.toString() === buyerId.toString()
      );
      if (assignedBuyer) {
        assignedBuyer.accepted = true;
        assignedBuyer.rejected = false;
      }
      lead.status = "sold";
      await lead.save();

      return NextResponse.json(
        { message: "Lead accepted and purchased successfully" },
        { status: 200 }
      );
    } else if (action === "reject") {
      // Update lead status to 'available' and remove buyer from assignedTo
      lead.status = "available";
      // Set rejected to true for the assigned buyer before removing or updating
      const assignedBuyer = lead.assignedTo.find(
        (assigned: AssignedBuyer) =>
          assigned.buyerId && assigned.buyerId.toString() === buyerId.toString()
      );
      if (assignedBuyer) {
        assignedBuyer.rejected = true;
        assignedBuyer.accepted = false;
      }
      lead.assignedTo = lead.assignedTo.filter(
        (assigned: AssignedBuyer) =>
          assigned.buyerId && assigned.buyerId.toString() !== buyerId.toString()
      );
      await lead.save();

      return NextResponse.json({ message: "Lead rejected" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
