import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models/user";
import { Lead } from "@/models/leads";
import Call from "@/models/call";
import { Transaction } from "@/models/transactions";

export async function GET(req: NextRequest) {
  // Get the session using getServerSession
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "buyer") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const buyerEmail = session.user.email;

  try {
    // Fetch buyer information
    const buyer = await Buyer.findOne({ email: buyerEmail });
    if (!buyer) {
      return NextResponse.json({ message: "Buyer not found" }, { status: 404 });
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
      "assignedTo.buyerId": buyer._id,
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

    // Fetch total unit used
    const totalUnitUsed = await Lead.aggregate([
      { $match: { "soldTo.buyerId": buyer._id } },
      { $group: { _id: null, total: { $sum: "$soldTo.unit" } } },
    ]);
    const totalUnitUsedValue = totalUnitUsed.length
      ? totalUnitUsed[0].total
      : 0;

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
      purchasedLeads,
      availableLeads,
      sellerInfo,
      assignedLeads,
      acceptedLeads,
      rejectedLeads,
      walletUnit,
      totalUnitPurchased,
      totalUnitUsed: totalUnitUsedValue,
      callsReceived,
      callsMissed,
    });
  } catch (error) {
    console.error("Failed to fetch overview data", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
