import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { Lead } from "@/models/leads";
import Call from "@/models/call";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  // Get the session using getServerSession
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "buyer") {
    return unauthorized("Authentication required");
  }

  const buyerEmail = session.user.email;

  try {
    await dbConnect();

    // Fetch buyer information
    const buyer = await Buyer.findOne({ email: buyerEmail });
    if (!buyer) {
      return notFound("Buyer");
    }

    // Fetch seller information
    const seller = await User.findById(buyer.registeredWith);
    const sellerInfo = seller
      ? {
          name: seller.name,
          email: seller.email,
          mobileNumber: seller.mobileNumber,
          image: seller.image,
        }
      : { name: "", email: "", mobileNumber: "", image: "" };

    // Fetch purchased leads count
    const purchasedLeads = await Lead.countDocuments({
      "soldTo.buyerId": buyer._id,
    });

    // Fetch available leads count
    const availableLeads = await Lead.countDocuments({
      status: "available",
      exclusive: false,
    });

    // Fetch assigned leads count
    const assignedLeads = await Lead.countDocuments({
      "assignedTo.buyerId": buyer._id,
    });

    // Fetch accepted and rejected leads count
    const acceptedLeads = await Lead.countDocuments({
      "assignedTo.buyerId": buyer._id,
      "assignedTo.accepted": true,
    });

    const rejectedLeads = await Lead.countDocuments({
      "assignedTo.buyerId": buyer._id.toString(),
      "assignedTo.rejected": true,
    });

    // Fetch wallet unit
    const walletUnit = buyer.walletUnit || 0;

    // Fetch total unit purchased
    const totalUnits = await Transaction.aggregate([
      {
        $match: {
          type: "units_purchase",
          userId: buyer._id, // Use the buyer's ID here
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$metadata.unitsPurchased" },
        },
      },
    ]);

    const totalUnitPurchased =
      totalUnits.length > 0 ? totalUnits[0].totalUnits : 0;

    // Fetch calls received and missed
    const callsReceived = await Call.countDocuments({
      "answeredBy.buyerId": buyer._id,
    });

    const callsMissed = await Call.countDocuments({
      "answeredBy.buyerId": buyer._id,
      status: "no answer",
    });

    // Return the overview data
    return NextResponse.json({
      success: true,
      data: {
        purchasedLeads,
        availableLeads,
        sellerInfo,
        assignedLeads,
        acceptedLeads,
        rejectedLeads,
        walletUnit,
        totalUnitPurchased,
        totalUnitUsed: totalUnitPurchased - walletUnit,
        callsReceived,
        callsMissed,
      },
    });
  } catch (error) {
    console.error("Failed to fetch overview data", error);
    return internalError("Internal Server Error");
  }
}
