/**
 * Marketplace Notification Service
 * Notifies all matching buyers when a lead becomes available in marketplace
 * Used for: Low quality leads, rejected leads, unmatched high/medium leads
 */

import { Lead, ILead } from "@/models/leads";
import { Buyer, IBuyer } from "@/models/leadbuyers";
import { sendNotification } from "@/lib/notificationService";
import dbConnect from "@/lib/connectdb";

export interface MarketplaceNotificationResult {
  leadId: string;
  notifiedBuyers: Array<{
    buyerId: string;
    buyerEmail: string;
    channels: string[];
  }>;
  errors: Array<{
    buyerId: string;
    error: string;
  }>;
}

/**
 * Check if lead loosely matches buyer's criteria for marketplace notification
 * Uses softer matching than strict auto-assignment (includes partial matches)
 */
function matchesMarketplaceCriteria(lead: ILead, buyer: IBuyer): boolean {
  // 1. Check buyer is active
  if (!buyer.isActive || buyer.status === "suspended") {
    return false;
  }

  // 2. Check qualification score (using qualityLevel map)
  const qualityScoreMap: Record<string, number> = {
    High: 100,
    Medium: 60,
    Low: 30,
  };
  const leadQualityScore = qualityScoreMap[lead.qualityLevel || "Medium"] || 60;

  if (
    buyer.qualificationScoreMinimum &&
    leadQualityScore < buyer.qualificationScoreMinimum
  ) {
    return false;
  }

  // 3. Check excluded sources
  if (
    buyer.excludedSources &&
    buyer.excludedSources.length > 0 &&
    buyer.excludedSources.includes(lead.leadSource)
  ) {
    return false;
  }

  // 6. Check wallet balance (soft check - warn if low)
  if (buyer.walletBalance && buyer.walletBalance < (lead.unit || 0)) {
    // Don't exclude based on wallet - buyer might purchase units later
    // But we can make a note
  }

  // 7. Check daily limits (soft check)
  if (buyer.maxLeadsPerDay && buyer.currentLeadsToday >= buyer.maxLeadsPerDay) {
    // Don't exclude - buyer might have capacity later
  }

  return true;
}

/**
 * Notify all matching buyers about a new marketplace lead
 * Called when: Lead has low quality, rejected by another buyer, or couldn't be auto-assigned
 */
export async function notifyMatchingBuyers(
  lead: ILead,
  reason: "low_quality" | "rejected" | "unmatched" | "fallback",
): Promise<MarketplaceNotificationResult> {
  await dbConnect();

  const result: MarketplaceNotificationResult = {
    leadId: lead._id.toString(),
    notifiedBuyers: [],
    errors: [],
  };

  try {
    // Find all buyers registered with this seller
    const buyers = await Buyer.find({
      registeredWith: lead.userId,
      isActive: true,
      status: { $ne: "suspended" },
    });

    if (buyers.length === 0) {
      console.log(`ℹ️ No buyers registered with seller ${lead.userId}`);
      return result;
    }

    console.log(
      `📢 Finding matching buyers for marketplace lead ${lead._id} (reason: ${reason})`,
    );

    // Filter matching buyers
    const matchingBuyers = buyers.filter((buyer) =>
      matchesMarketplaceCriteria(lead, buyer as IBuyer),
    );

    console.log(
      `✓ Found ${matchingBuyers.length} matching buyers for marketplace notification`,
    );

    if (matchingBuyers.length === 0) {
      console.log(
        `ℹ️ No buyers matched criteria for marketplace lead ${lead._id}`,
      );
      return result;
    }

    // Send notifications to all matching buyers
    for (const buyer of matchingBuyers) {
      try {
        const leadName =
          lead.fields?.find((f) => f.label.toLowerCase() === "name")?.value ||
          "Unknown Lead";

        const leadEmail =
          lead.fields?.find((f) => f.label.toLowerCase() === "email")?.value ||
          "N/A";

        // Build notification message based on reason
        let messageTitle = "New Lead Available";
        let messageBody = "";

        switch (reason) {
          case "low_quality":
            messageTitle = "New Lead Available - Marketplace";
            messageBody = `A new lead matching your preferences is available in the marketplace: ${leadName}. Quality: ${lead.qualityLevel}`;
            break;
          case "rejected":
            messageTitle = "Lead Re-Listed - Marketplace";
            messageBody = `Previously rejected lead now available: ${leadName}. You may have another chance to purchase.`;
            break;
          case "unmatched":
            messageTitle = "Lead Available - No Direct Match";
            messageBody = `A lead matching your general preferences is available: ${leadName}. Browse marketplace to view details.`;
            break;
          case "fallback":
            messageTitle = "Lead Available - Marketplace";
            messageBody = `New lead available: ${leadName}. Check marketplace for details and purchase if interested.`;
            break;
        }

        // Send dashboard notification (always)
        await sendNotification({
          userId: buyer._id.toString(),
          type: "alert",
          title: messageTitle,
          message: messageBody,
          metadata: {
            leadId: lead._id,
            leadName,
            leadEmail,
            qualityLevel: lead.qualityLevel,
            industry: lead.industry,
            location: lead.location,
            price: lead.unit,
            reason,
            marketplace: true,
          },
        });

        const channels: string[] = ["dashboard"];

        // Send email if enabled (optional enhancement)
        if (buyer.notificationPreferences?.includes("Email")) {
          channels.push("email");
        }

        // Send SMS if enabled (optional enhancement)
        if (buyer.notificationPreferences?.includes("SMS")) {
          channels.push("sms");
        }

        result.notifiedBuyers.push({
          buyerId: buyer._id.toString(),
          buyerEmail: buyer.email,
          channels,
        });

        console.log(
          `✅ Notified buyer ${buyer._id} about marketplace lead ${lead._id}`,
        );
      } catch (buyerNotifError) {
        console.error(
          `❌ Error notifying buyer ${buyer._id}:`,
          buyerNotifError,
        );
        result.errors.push({
          buyerId: buyer._id.toString(),
          error:
            buyerNotifError instanceof Error
              ? buyerNotifError.message
              : "Failed to send notification",
        });
      }
    }

    console.log(
      `✅ Marketplace notifications completed: ${result.notifiedBuyers.length} notified, ${result.errors.length} errors`,
    );

    return result;
  } catch (error) {
    console.error("Error in notifyMatchingBuyers:", error);
    result.errors.push({
      buyerId: "system",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

/**
 * Mark a lead as available in marketplace and notify buyers
 */
export async function makeLeadAvailableInMarketplace(
  lead: ILead,
  reason: "low_quality" | "rejected" | "unmatched" | "fallback",
): Promise<{
  success: boolean;
  notificationResult?: MarketplaceNotificationResult;
}> {
  try {
    await dbConnect();

    // Mark lead as available in marketplace
    await Lead.findByIdAndUpdate(lead._id, {
      status: "available",
      availableInMarketplace: true,
      marketplaceAvailableAt: new Date(),
      marketplaceReason: reason,
    });

    console.log(
      `📍 Lead ${lead._id} marked as available in marketplace (reason: ${reason})`,
    );

    // Notify matching buyers
    const notificationResult = await notifyMatchingBuyers(lead, reason);

    return {
      success: true,
      notificationResult,
    };
  } catch (error) {
    console.error("Error making lead available in marketplace:", error);
    return {
      success: false,
    };
  }
}
