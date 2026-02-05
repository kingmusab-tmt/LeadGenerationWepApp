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
import {
  invalidateSessionCache,
  invalidateLeadCache,
  invalidateBuyerCache,
} from "@/lib/cachedSession"; // Import cache invalidation functions

export async function POST(req: NextRequest) {
  // Ensure the request is a POST request
  if (req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed" },
      { status: 405 },
    );
  }
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "seller") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { message: "Missing or invalid leadIds or buyerIds in request body" },
        { status: 400 },
      );
    }

    // Find all leads and buyers in the database
    const leads = (await Lead.find({ _id: { $in: leadIds } })) as Array<{
      assignedTo: any;
      status: string;
      save(): unknown;
      _id: string;
    }>;
    const buyers = await Buyer.find({ _id: { $in: buyerIds } });

    // Check if all leads and buyers exist
    if (leads.length !== leadIds.length) {
      const missingLeadIds = leadIds.filter(
        (id) => !leads.some((lead) => (lead._id as string).toString() === id),
      );
      return NextResponse.json(
        { message: `Leads not found: ${missingLeadIds.join(", ")}` },
        { status: 404 },
      );
    }
    if (buyers.length !== buyerIds.length) {
      const missingBuyerIds = buyerIds.filter(
        (id) => !buyers.some((buyer) => buyer._id.toString() === id),
      );
      return NextResponse.json(
        { message: `Buyers not found: ${missingBuyerIds.join(", ")}` },
        { status: 404 },
      );
    }

    // Assign leads to buyers
    const assignmentResults = [];
    const notificationErrors = [];

    for (const lead of leads) {
      for (const buyer of buyers) {
        try {
          // Update the lead's assignedTo array
          lead.assignedTo = lead.assignedTo || [];

          // Check if the buyer is already assigned
          const isAlreadyAssigned = lead.assignedTo.some(
            (assigned: { buyerId: { toString: () => string } }) =>
              assigned.buyerId.toString() === buyer._id.toString(),
          );

          if (!isAlreadyAssigned) {
            // Add the buyer to the assignedTo array in the correct format
            lead.assignedTo.push({
              buyerId: buyer._id,
              accepted: false,
              rejected: false,
            });
          }

          lead.status = "assigned";

          // Save the updated lead
          await lead.save();

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
    return NextResponse.json(
      {
        message: "Failed to assign leads",
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 },
    );
  }
}
