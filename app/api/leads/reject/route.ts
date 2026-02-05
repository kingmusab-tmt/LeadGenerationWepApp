import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Lead, ILead } from "@/models/leads";
import { Buyer, IBuyer } from "@/models/leadbuyers";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { sendNotification } from "@/lib/notificationService";
import { makeLeadAvailableInMarketplace } from "@/lib/marketplaceNotificationService";

/**
 * POST /api/leads/reject
 * Handle buyer rejection of assigned leads
 * Fallback to marketplace or reassign to another buyer if available
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // ========================================
    // 1. VERIFY AUTHENTICATION
    // ========================================
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const buyerId = session.user.id;

    // ========================================
    // 2. PARSE REQUEST BODY
    // ========================================
    const { leadId, reason } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    // ========================================
    // 3. FETCH LEAD AND VALIDATE
    // ========================================
    const lead = (await Lead.findById(leadId)) as ILead | null;
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if lead is assigned to this buyer
    const assignmentIndex = lead.assignedTo.findIndex(
      (a: any) => a.buyerId.toString() === buyerId,
    );

    if (assignmentIndex === -1) {
      return NextResponse.json(
        { error: "Lead is not assigned to this buyer" },
        { status: 403 },
      );
    }

    // ========================================
    // 4. MARK ASSIGNMENT AS REJECTED
    // ========================================
    lead.assignedTo[assignmentIndex].rejected = true;

    const sellerUserId = lead.userId.toString();
    const buyer = (await Buyer.findById(buyerId)) as IBuyer | null;
    const seller = await User.findById(sellerUserId);

    // ========================================
    // 5. FALLBACK LOGIC
    // ========================================

    // Try to assign to another matching buyer
    let reassignedTo: any = null;
    const otherBuyers = await Buyer.find({
      registeredWith: sellerUserId,
      isActive: true,
      status: { $ne: "suspended" },
      _id: { $ne: buyerId },
    }).lean();

    // Find first buyer with matching criteria who hasn't rejected this lead
    for (const otherBuyer of otherBuyers) {
      const hasRejected = lead.assignedTo.some(
        (a: any) =>
          a.buyerId.toString() === otherBuyer._id.toString() &&
          a.rejected === true,
      );

      if (!hasRejected) {
        // This buyer hasn't rejected yet - try to assign
        const newAssignment = {
          buyerId: otherBuyer._id.toString(),
          accepted: false,
          rejected: false,
          assignedAt: new Date(),
        };
        lead.assignedTo.push(newAssignment);
        reassignedTo = otherBuyer;

        console.log(
          `📤 Lead ${leadId} reassigned from ${buyerId} to ${otherBuyer._id} after rejection`,
        );
        break;
      }
    }

    // If no other buyer available or all rejected, move to marketplace
    if (!reassignedTo) {
      console.log(
        `📢 Lead ${leadId} moving to marketplace after ${buyer?.email || "unknown buyer"} rejection`,
      );
      try {
        await makeLeadAvailableInMarketplace(lead, "rejected");
      } catch (error) {
        console.error("Error making lead available in marketplace:", error);
      }
    }

    // ========================================
    // 6. SAVE LEAD
    // ========================================
    await lead.save();

    // ========================================
    // 7. SEND NOTIFICATIONS
    // ========================================

    // Notify buyer of successful rejection
    if (buyer) {
      try {
        await sendNotification({
          userId: buyerId,
          type: "success",
          title: "Lead Rejection Confirmed",
          message: reassignedTo
            ? `You have successfully rejected this lead. It will not be reassigned to you.`
            : `You have successfully rejected this lead. It is now available in the marketplace.`,
          metadata: {
            leadId: leadId,
            marketplaceAvailable: !reassignedTo,
          },
        });
      } catch (error) {
        console.error("Error notifying buyer:", error);
      }
    }

    // Notify seller of rejection
    if (seller) {
      try {
        await sendNotification({
          userId: sellerUserId,
          type: "alert",
          title: "Lead Rejected by Buyer",
          message: reassignedTo
            ? `Lead was rejected by ${buyer?.email || "a buyer"} but will be reassigned to another buyer.`
            : `Lead was rejected by ${buyer?.email || "a buyer"}. It is now available in the marketplace for purchase.`,
          metadata: {
            leadId: leadId,
            rejectionReason: reason,
            reassignedTo: reassignedTo?._id || null,
          },
        });
      } catch (error) {
        console.error("Error notifying seller:", error);
      }
    }

    // If reassigned, notify new buyer
    if (reassignedTo) {
      try {
        await sendNotification({
          userId: reassignedTo._id.toString(),
          type: "info",
          title: "New Lead Assigned",
          message: `A new qualified lead has been assigned to you.`,
          metadata: {
            leadId: leadId,
            industry: lead.industry,
          },
        });
      } catch (error) {
        console.error("Error notifying new buyer:", error);
      }
    }

    // ========================================
    // 8. RETURN RESPONSE
    // ========================================
    return NextResponse.json(
      {
        success: true,
        message: "Lead rejection processed successfully",
        leadId: leadId,
        reassignedTo: reassignedTo ? reassignedTo._id : null,
        marketplaceAvailable: !reassignedTo,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing lead rejection:", error);
    return NextResponse.json(
      {
        error: "Failed to process lead rejection",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
