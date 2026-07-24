import dbConnect from "@/lib/connectdb";
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { leadId } = await req.json();

    if (!leadId || typeof leadId !== "string") {
      return badRequest("leadId is required");
    }

    // Get the session to retrieve the buyer's email
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "buyer") {
      return unauthorized("Authentication required");
    }

    // Find the buyer using the session email
    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return notFound("Buyer");
    }

    // The lead's price is looked up server-side below and is never taken
    // from the request — a client-supplied cost previously let a buyer buy
    // any lead for an arbitrary price.
    const leadForPrice = await Lead.findById(leadId).select(
      "unit status soldCount shareNumber",
    );
    if (!leadForPrice) {
      return notFound("Lead");
    }
    if (leadForPrice.status !== "available") {
      return badRequest("Lead is not available for purchase");
    }
    if (leadForPrice.soldCount >= leadForPrice.shareNumber) {
      return badRequest("Lead is no longer available");
    }
    const unitCost = leadForPrice.unit;

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Atomically claim a slot on the lead — the status/soldCount
      // condition here is re-checked against the live document so two
      // concurrent purchases of the same (possibly shared) lead can't both
      // succeed past the point where it's actually sold out.
      const claimedLead = await Lead.findOneAndUpdate(
        {
          _id: leadId,
          status: "available",
          $expr: { $lt: ["$soldCount", "$shareNumber"] },
        },
        {
          $inc: { soldCount: 1 },
          $push: {
            soldTo: { buyerId: buyer._id, createdAt: new Date(), unit: unitCost },
          },
        },
        { session: mongoSession, new: true },
      );

      if (!claimedLead) {
        await mongoSession.abortTransaction();
        return badRequest("Lead is no longer available");
      }

      if (claimedLead.soldCount >= claimedLead.shareNumber) {
        claimedLead.status = "sold";
        await claimedLead.save({ session: mongoSession });
      }

      // Atomically debit the buyer's wallet, guarded by a fresh balance
      // check on the live document — a second concurrent purchase can't
      // drive the wallet negative even if it raced past an earlier read.
      const leadIdString = claimedLead._id.toString();
      const updatedBuyer = await Buyer.findOneAndUpdate(
        { _id: buyer._id, walletUnit: { $gte: unitCost } },
        {
          $inc: { walletUnit: -unitCost },
          $push: {
            purchaseHistory: {
              leadId: leadIdString,
              date: new Date(),
              amount: unitCost,
              unit: unitCost,
            },
            purchasedLeadsData: {
              leadId: leadIdString,
              name: claimedLead.name || "",
              email: claimedLead.email || "",
              phone: claimedLead.phone || "",
              company: claimedLead.company || "",
              industry: claimedLead.industry || "",
              location: {
                city: claimedLead.location?.city || "",
                state: claimedLead.location?.state || "",
                country: claimedLead.location?.country || "USA",
                zipCode: claimedLead.location?.zipCode || "",
                address: claimedLead.location?.address || "",
              },
              fields: claimedLead.fields || [],
              aiQualityScore: claimedLead.aiQualityScore,
              qualityLevel: claimedLead.qualityLevel,
              purchasedAt: new Date(),
              unitPaid: unitCost,
              purchaseType: "marketplace",
            },
          },
          $addToSet: { purchasedLeads: new Types.ObjectId(claimedLead._id) },
        },
        { session: mongoSession, new: true },
      );

      if (!updatedBuyer) {
        await mongoSession.abortTransaction();
        return badRequest("Insufficient wallet balance");
      }

      // Fetch seller details for transaction record
      const seller = await User.findById(buyer.registeredWith).session(
        mongoSession,
      );

      await Transaction.create(
        [
          {
            type: "lead_purchase",
            userId: buyer._id,
            amount: unitCost,
            previousBalance: updatedBuyer.walletUnit + unitCost,
            currentBalance: updatedBuyer.walletUnit,
            metadata: {
              leadId: claimedLead._id,
              sellerId: buyer.registeredWith,
              sellerName: seller?.name || "Unknown",
              sellerEmail: seller?.email || "N/A",
              buyerId: buyer._id,
              buyerName: buyer.name || "Unknown",
              buyerEmail: buyer.email || "N/A",
              unitsPurchased: unitCost,
            },
            status: "completed",
          },
        ],
        { session: mongoSession },
      );

      await mongoSession.commitTransaction();
    } catch (txError) {
      await mongoSession.abortTransaction();
      throw txError;
    } finally {
      mongoSession.endSession();
    }

    return NextResponse.json({
      success: true,
      message: "Lead purchased successfully",
    });
  } catch (error) {
    console.error("Error purchasing lead:", error);
    return internalError("Internal server error");
  }
}
