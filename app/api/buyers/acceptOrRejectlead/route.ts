import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads"; // Import Lead model
import { Buyer } from "@/models/leadbuyers"; // Import Buyer model
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Transaction } from "@/models/transactions";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

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
    const { leadId, action } = await req.json(); // action: 'accept' or 'reject'

    if (!leadId || !action) {
      return badRequest("Missing required fields");
    }

    if (action !== "accept" && action !== "reject") {
      return badRequest("Invalid action");
    }

    // Connect to the database
    await dbConnect();

    if (action === "reject") {
      // Single-document, single-operation update — inherently atomic, no
      // need for a transaction. Also drops the previous dead code that set
      // accepted/rejected flags on the assignedTo entry immediately before
      // pulling that same entry out of the array.
      const rejectedLead = await Lead.findOneAndUpdate(
        { _id: leadId, "assignedTo.buyerId": buyerId },
        {
          $set: { status: "available" },
          $pull: { assignedTo: { buyerId } },
        },
        { new: true },
      );

      if (!rejectedLead) {
        return badRequest("Lead not assigned to this buyer");
      }

      return NextResponse.json({ message: "Lead rejected" }, { status: 200 });
    }

    // action === "accept"
    const lead = await Lead.findById(leadId).select("unit assignedTo");
    if (!lead) {
      return notFound("Lead");
    }

    const isAssigned = lead.assignedTo.some(
      (assigned) =>
        assigned.buyerId && assigned.buyerId.toString() === buyerId.toString(),
    );
    if (!isAssigned) {
      return badRequest("Lead not assigned to this buyer");
    }

    const unitCost = lead.unit;

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Atomically claim the assignment — only matches (and flips) an
      // assignedTo entry for this buyer that hasn't already been accepted,
      // so two concurrent accept calls (or an accept racing a reject)
      // can't both succeed.
      const claimedLead = await Lead.findOneAndUpdate(
        {
          _id: leadId,
          assignedTo: { $elemMatch: { buyerId, accepted: false } },
        },
        {
          $set: {
            status: "sold",
            "assignedTo.$.accepted": true,
            "assignedTo.$.rejected": false,
          },
          $push: {
            soldTo: { buyerId, createdAt: new Date(), unit: unitCost },
          },
        },
        { session: mongoSession, new: true },
      );

      if (!claimedLead) {
        await mongoSession.abortTransaction();
        return badRequest("Lead is no longer available to accept");
      }

      // Atomically debit the buyer's wallet, guarded by a fresh balance
      // check on the live document.
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
              purchaseType: "assigned",
            },
          },
          $addToSet: { purchasedLeads: new Types.ObjectId(claimedLead._id) },
        },
        { session: mongoSession, new: true },
      );

      if (!updatedBuyer) {
        await mongoSession.abortTransaction();
        return badRequest("Insufficient credit balance");
      }

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

    return NextResponse.json(
      { message: "Lead accepted and purchased successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return internalError("Internal server error");
  }
}
