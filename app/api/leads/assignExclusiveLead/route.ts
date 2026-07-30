// pages/api/assign-lead.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads"; // Import Lead model
import { Buyer } from "@/models/leadbuyers";
import { sendEmailNotification } from "@/utils/email";
import { sendSmsNotification } from "@/utils/sms";
import { sendPushNotification } from "@/utils/pushNotification";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { invalidateLeadCache, invalidateBuyerCache } from "@/lib/cachedSession"; // Import cache invalidation functions
import {
  badRequest,
  internalError,
  methodNotAllowed,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

import { isSellerRole } from "@/lib/roles";
export async function POST(req: NextRequest) {
  // Ensure the request is a POST request
  if (req.method !== "POST") {
    return methodNotAllowed();
  }
  const session = await getServerSession(authOptions);
  if (!session || !isSellerRole(session.user.role)) {
    return unauthorized("Authentication required");
  }

  try {
    // Connect to the database
    await dbConnect();

    // Parse the request body
    const { leadIds, buyerIds } = await req.json();

    // Validate request body
    if (
      !leadIds ||
      !buyerIds ||
      !Array.isArray(leadIds) ||
      !Array.isArray(buyerIds)
    ) {
      return badRequest(
        "Missing or invalid leadIds or buyerIds in request body",
      );
    }

    // Find all leads and buyers in the database
    const leads = (await Lead.find({ _id: { $in: leadIds } })) as Array<{
      assignedTo: Array<{
        buyerId: { toString: () => string };
        accepted: boolean;
        rejected: boolean;
      }>;
      status: string;
      name?: string;
      save(): unknown;
      _id: string;
    }>;
    const buyers = await Buyer.find({ _id: { $in: buyerIds } });

    // Check if all leads and buyers exist
    if (leads.length !== leadIds.length) {
      const missingLeadIds = leadIds.filter(
        (id) => !leads.some((lead) => (lead._id as string).toString() === id),
      );
      return notFound("Lead", `Leads not found: ${missingLeadIds.join(", ")}`);
    }
    if (buyers.length !== buyerIds.length) {
      const missingBuyerIds = buyerIds.filter(
        (id) => !buyers.some((buyer) => buyer._id.toString() === id),
      );
      return notFound(
        "Buyer",
        `Buyers not found: ${missingBuyerIds.join(", ")}`,
      );
    }

    // Assign leads to buyers
    const assignmentResults = [];
    const notificationErrors = [];

    for (const lead of leads) {
      for (const buyer of buyers) {
        try {
          // Atomically add the buyer to assignedTo only if they aren't
          // already there — the query condition ("assignedTo.buyerId" $ne)
          // is re-checked against the live document, so two concurrent
          // bulk-assign requests for the same lead/buyer pair can't both
          // push a duplicate entry (the previous in-memory check-then-save
          // could race and double-assign under concurrent calls).
          const updatedLead = await Lead.findOneAndUpdate(
            { _id: lead._id, "assignedTo.buyerId": { $ne: buyer._id } },
            {
              $push: {
                assignedTo: { buyerId: buyer._id, accepted: false, rejected: false },
              },
              $set: { status: "assigned" },
            },
            { new: true },
          );

          if (!updatedLead) {
            // Already assigned to this buyer — nothing to do, not an error.
            assignmentResults.push({
              leadId: lead._id,
              buyerId: buyer._id,
              status: "already_assigned",
            });
            continue;
          }

          // PHASE 1: Sync Buyer.assignedLeads array
          await Buyer.findByIdAndUpdate(
            buyer._id,
            { $addToSet: { assignedLeads: lead._id } }, // $addToSet prevents duplicates
            { new: true },
          ).exec();

          // Send notification based on buyer's preference
          try {
            if (
              buyer.notificationPreferences.includes("Email") &&
              buyer.notificationPreferences.includes("SMS") &&
              buyer.notificationPreferences.includes("In-App Notification")
            ) {
              await sendEmailNotification(buyer._id, lead);
              await sendSmsNotification(buyer._id, lead);
              await sendPushNotification(buyer._id, lead);
            } else if (
              buyer.notificationPreferences.includes("Email") &&
              buyer.notificationPreferences.includes("SMS")
            ) {
              await sendEmailNotification(buyer._id, lead);
              await sendSmsNotification(buyer._id, lead);
            } else if (
              buyer.notificationPreferences.includes("Email") &&
              buyer.notificationPreferences.includes("In-App Notification")
            ) {
              await sendEmailNotification(buyer._id, lead);
              await sendPushNotification(buyer._id, lead);
            } else if (
              buyer.notificationPreferences.includes("In-App Notification") &&
              buyer.notificationPreferences.includes("SMS")
            ) {
              await sendPushNotification(buyer._id, lead);
              await sendSmsNotification(buyer._id, lead);
            } else if (buyer.notificationPreferences.includes("Email")) {
              await sendEmailNotification(buyer._id, lead);
            } else if (buyer.notificationPreferences.includes("SMS")) {
              await sendSmsNotification(buyer._id, lead);
            } else if (
              buyer.notificationPreferences.includes("In-App Notification")
            ) {
              await sendPushNotification(buyer._id, lead);
            } else {
              //("No notification preference set");
            }
          } catch (notificationError) {
            console.error("Error sending notifications:", notificationError);
            notificationErrors.push({
              leadId: lead._id,
              buyerId: buyer._id,
              error:
                notificationError instanceof Error
                  ? notificationError.message
                  : "Unknown error",
            });
          }

          assignmentResults.push({
            leadId: lead._id,
            buyerId: buyer._id,
            status: "assigned",
          });
        } catch (assignmentError) {
          console.error("Error assigning lead to buyer:", assignmentError);
          assignmentResults.push({
            leadId: lead._id,
            buyerId: buyer._id,
            status: "failed",
            error:
              assignmentError instanceof Error
                ? assignmentError.message
                : "Unknown error",
          });
        }
      }
    }

    // Check if any assignments failed
    const failedAssignments = assignmentResults.filter(
      (result) => result.status === "failed",
    );

    // PHASE 1: Invalidate caches for all updated leads and buyers
    for (const result of assignmentResults.filter(
      (r) => r.status === "assigned",
    )) {
      await invalidateLeadCache(result.leadId);
      await invalidateBuyerCache(result.buyerId);
    }

    if (failedAssignments.length > 0 || notificationErrors.length > 0) {
      return NextResponse.json(
        {
          message: "Some assignments or notifications failed",
          assignmentResults,
          notificationErrors,
        },
        { status: 207 }, // 207 Multi-Status
      );
    }

    return NextResponse.json(
      { message: "All leads assigned successfully", assignmentResults },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error assigning leads:", error);
    return internalError(
      error instanceof Error
        ? `Failed to assign leads: ${error.message}`
        : "Failed to assign leads",
    );
  }
}
