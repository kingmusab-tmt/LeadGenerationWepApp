/**
 * Auto-Accept & Auto-Purchase Service
 * Handles automatic lead purchase for buyers with auto-accept enabled
 * Including wallet debit, seller credit, and transaction creation
 */

import { Lead, ILead } from "@/models/leads";
import { Buyer, IBuyer, IBuyerCriteriaSet } from "@/models/leadbuyers";
import { User } from "@/models";
import { sendNotification } from "@/lib/notificationService";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import mongoose from "mongoose";

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

type LocationCriteria = NonNullable<IBuyerCriteriaSet["locations"]>[number];

type SellerSummary = {
  _id: unknown;
  name?: string;
  email?: string;
};

function toIdString(id: unknown): string {
  if (typeof id === "string") return id;
  if (id instanceof mongoose.Types.ObjectId) return id.toString();
  return String(id);
}

export interface AutoPurchaseResult {
  leadId: string;
  purchasedByBuyers: Array<{
    buyerId: string;
    buyerEmail: string;
    success: boolean;
    reason?: string;
  }>;
  errors: Array<{
    buyerId: string;
    error: string;
  }>;
}

/**
 * Check if lead matches buyer's criteria set AND buyer's global preferences
 */
function checkCriteriaMatch(
  lead: ILead,
  criteriaSet: IBuyerCriteriaSet,
  buyer: IBuyer,
): boolean {
  // ── Global Buyer Checks (not in criteria set) ──

  // Vacation mode
  if (buyer.vacationMode?.enabled) {
    const now = new Date();
    if (!buyer.vacationMode.pauseUntil || buyer.vacationMode.pauseUntil > now) {
      if (buyer.vacationMode.autoReject) {
        return false;
      }
    }
  }

  // Qualification score minimum
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

  // Max concurrent leads
  if (
    buyer.maxConcurrentLeads &&
    buyer.currentLeads >= buyer.maxConcurrentLeads
  ) {
    return false;
  }

  // Period-based volume limit
  if (
    buyer.volumeLimitCount &&
    buyer.volumeLimitCount > 0 &&
    buyer.currentPeriodCount >= buyer.volumeLimitCount
  ) {
    return false;
  }

  // Period-based budget limit
  if (buyer.budgetLimitAmount && buyer.budgetLimitAmount > 0) {
    const estimatedCost = lead.unit || buyer.maxPricePerLead || 0;
    if (buyer.currentPeriodSpent + estimatedCost > buyer.budgetLimitAmount) {
      return false;
    }
  }

  // Lead age / freshness
  if (buyer.maxLeadAge && buyer.maxLeadAge > 0 && lead.createdAt) {
    const leadAgeHours =
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
    if (leadAgeHours > buyer.maxLeadAge) {
      return false;
    }
  }

  // Business hours / weekly schedule check
  if (buyer.acceptOnlyDuringBusinessHours) {
    try {
      const tzString = buyer.timezone || "America/New_York";
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tzString,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
        weekday: "long",
      });
      const parts = formatter.formatToParts(new Date());
      const hourPart = parts.find((p) => p.type === "hour");
      const minutePart = parts.find((p) => p.type === "minute");
      const weekdayPart = parts.find((p) => p.type === "weekday");

      const currentTime =
        parseInt(hourPart?.value || "0", 10) * 60 +
        parseInt(minutePart?.value || "0", 10);
      const dayName = weekdayPart?.value || "";
      const isWeekend = dayName === "Saturday" || dayName === "Sunday";

      if (buyer.weeklySchedule) {
        const daySchedule =
          buyer.weeklySchedule instanceof Map
            ? buyer.weeklySchedule.get(dayName)
            : (buyer.weeklySchedule as Record<string, DaySchedule | undefined>)[
                dayName
              ];

        if (daySchedule) {
          if (!daySchedule.enabled) return false;
          const [sH, sM] = daySchedule.start.split(":").map(Number);
          const [eH, eM] = daySchedule.end.split(":").map(Number);
          if (currentTime < sH * 60 + sM || currentTime > eH * 60 + eM) {
            return false;
          }
        } else {
          if (isWeekend && !buyer.notifyOnWeekends) return false;
          const [sH, sM] = buyer.workingHours.start.split(":").map(Number);
          const [eH, eM] = buyer.workingHours.end.split(":").map(Number);
          if (currentTime < sH * 60 + sM || currentTime > eH * 60 + eM) {
            return false;
          }
        }
      } else {
        if (isWeekend && !buyer.notifyOnWeekends) return false;
        const [sH, sM] = buyer.workingHours.start.split(":").map(Number);
        const [eH, eM] = buyer.workingHours.end.split(":").map(Number);
        if (currentTime < sH * 60 + sM || currentTime > eH * 60 + eM) {
          return false;
        }
      }
    } catch {
      // Fallback: skip business-hours check on parse error
    }
  }

  // ── Criteria Set Checks ──

  // Check lead types (exclusive vs shared)
  if (
    criteriaSet.leadTypes &&
    criteriaSet.leadTypes.length > 0 &&
    !criteriaSet.leadTypes.includes(lead.exclusive ? "exclusive" : "shared")
  ) {
    return false;
  }

  // Check industries
  if (
    criteriaSet.industries &&
    criteriaSet.industries.length > 0 &&
    lead.industry &&
    !criteriaSet.industries.includes(lead.industry)
  ) {
    return false;
  }

  // Check location match
  if (
    criteriaSet.locations &&
    criteriaSet.locations.length > 0 &&
    lead.location
  ) {
    const locationMatch = criteriaSet.locations.some(
      (loc: LocationCriteria) => {
        // City match
        if (
          loc.city &&
          loc.city.toLowerCase() === lead.location!.city?.toLowerCase()
        ) {
          return true;
        }
        // State match
        if (
          loc.state &&
          loc.state.toLowerCase() === lead.location!.state?.toLowerCase()
        ) {
          return true;
        }
        // Zip code match
        if (loc.zipCodes && lead.location!.zipCode) {
          return loc.zipCodes.includes(lead.location!.zipCode);
        }
        return false;
      },
    );

    if (!locationMatch) {
      return false;
    }
  }

  // Check price
  if (criteriaSet.maxPrice && lead.unit && lead.unit > criteriaSet.maxPrice) {
    return false;
  }

  // Check daily limit
  if (criteriaSet.dailyLimit && criteriaSet.dailyLimit > 0) {
    if ((lead.soldCount || 0) >= criteriaSet.dailyLimit) {
      return false;
    }
  }

  return true;
}

/**
 * Auto-purchase lead for a buyer with auto-accept enabled
 * Handles transaction, wallet debit/credit, and notifications
 */
async function autoPurchaseLead(
  lead: ILead,
  buyer: IBuyer,
  seller: SellerSummary,
): Promise<{ success: boolean; error?: string }> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate wallet balance
    if (buyer.walletUnit < (lead.unit || 0)) {
      await session.abortTransaction();
      return {
        success: false,
        error: "Insufficient wallet balance",
      };
    }

    // 2. Deduct units from buyer. The check above reads a `buyer` fetched
    // before this transaction started, so it can be stale if two leads
    // become auto-purchasable for the same buyer within milliseconds of
    // each other — guard the actual write with a walletUnit >= cost
    // condition so a second concurrent call can't drive the balance
    // negative even if it raced past the earlier check.
    const updatedBuyer = await Buyer.findOneAndUpdate(
      { _id: buyer._id, walletUnit: { $gte: lead.unit || 0 } },
      {
        $inc: {
          walletUnit: -(lead.unit || 0),
          currentLeadsToday: 1,
        },
        $push: {
          purchaseHistory: {
            leadId: lead._id,
            date: new Date(),
            amount: lead.unit || 0,
            unit: lead.unit || 0,
            type: "auto_purchase",
          },
        },
      },
      { session, new: true },
    );

    if (!updatedBuyer) {
      await session.abortTransaction();
      return {
        success: false,
        error: "Insufficient wallet balance",
      };
    }

    // 3. Add units to seller
    await User.findByIdAndUpdate(
      seller._id,
      {
        $inc: { walletBalance: lead.unit || 0 },
      },
      { session },
    );

    // 4. Update lead
    await Lead.findByIdAndUpdate(
      lead._id,
      {
        status: "sold",
        $inc: { soldCount: 1 },
        $push: {
          soldTo: {
            buyerId: buyer._id.toString(),
            createdAt: new Date(),
            unit: lead.unit || 0,
            autoAccepted: true,
          },
        },
      },
      { session },
    );

    // 5. Create transaction for buyer
    await Transaction.create(
      [
        {
          type: "lead_auto_purchase",
          userId: buyer._id,
          amount: lead.unit || 0,
          currency: "USD",
          previousBalance: (updatedBuyer?.walletUnit || 0) + (lead.unit || 0),
          currentBalance: updatedBuyer?.walletUnit || 0,
          metadata: {
            leadId: lead._id,
            sellerId: seller._id,
            sellerName: seller.name || "Unknown",
            sellerEmail: seller.email || "N/A",
            buyerId: buyer._id,
            buyerName: buyer.name || "Unknown",
            buyerEmail: buyer.email || "N/A",
            unitsPurchased: lead.unit || 0,
            autoPurchased: true,
          },
          paymentGateway: "internal",
          status: "completed",
          createdAt: new Date(),
        },
      ],
      { session },
    );

    // 6. Create transaction for seller
    await Transaction.create(
      [
        {
          type: "seller_income_auto_accept",
          userId: seller._id,
          amount: lead.unit || 0,
          currency: "USD",
          metadata: {
            leadId: lead._id,
            buyerId: buyer._id,
            buyerName: buyer.name || "Unknown",
            buyerEmail: buyer.email || "N/A",
            sellerId: seller._id,
            sellerName: seller.name || "Unknown",
            sellerEmail: seller.email || "N/A",
            autoAccepted: true,
          },
          paymentGateway: "internal",
          status: "completed",
          createdAt: new Date(),
        },
      ],
      { session },
    );

    // 7. Commit transaction
    await session.commitTransaction();

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in auto-purchase lead:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    session.endSession();
  }
}

/**
 * Process auto-accept purchases for a lead
 * Called when lead becomes available in marketplace (Low quality, unmatched, or rejected)
 */
export async function processAutoAcceptPurchases(
  lead: ILead,
): Promise<AutoPurchaseResult> {
  await dbConnect();

  const result: AutoPurchaseResult = {
    leadId: lead._id.toString(),
    purchasedByBuyers: [],
    errors: [],
  };

  try {
    // Get seller info
    const seller = await User.findById(lead.userId).select("_id email");
    if (!seller) {
      result.errors.push({
        buyerId: "system",
        error: "Seller not found",
      });
      return result;
    }

    // Find all buyers with auto-accept enabled
    const buyersWithAutoAccept = await Buyer.find({
      registeredWith: lead.userId,
      autoAcceptMatchingLeads: true,
      status: "active",
      isActive: true,
      activeCriteriaSetId: { $exists: true, $ne: null },
    });

    console.log(
      `🔍 Found ${buyersWithAutoAccept.length} buyers with auto-accept enabled for lead ${lead._id}`,
    );

    // Check each buyer's criteria
    for (const buyer of buyersWithAutoAccept) {
      try {
        // Get active criteria set
        const criteriaSet = buyer.criteriaSets?.find((cs: IBuyerCriteriaSet) =>
          cs._id.equals(buyer.activeCriteriaSetId),
        );

        if (!criteriaSet) {
          console.warn(
            `⚠️ Criteria set not found for buyer ${buyer._id}, skipping auto-accept`,
          );
          continue;
        }

        // Check if lead matches criteria
        if (
          !checkCriteriaMatch(
            lead,
            criteriaSet as IBuyerCriteriaSet,
            buyer as IBuyer,
          )
        ) {
          console.log(
            `✗ Lead ${lead._id} does not match criteria for buyer ${buyer._id}`,
          );
          continue;
        }

        // Additional checks: wallet balance, daily limits
        if (buyer.walletUnit < (lead.unit || 0)) {
          console.log(
            `✗ Buyer ${buyer._id} has insufficient wallet balance (${buyer.walletUnit} < ${lead.unit})`,
          );
          result.purchasedByBuyers.push({
            buyerId: buyer._id.toString(),
            buyerEmail: buyer.email,
            success: false,
            reason: "Insufficient wallet balance",
          });
          continue;
        }

        if (
          buyer.maxLeadsPerDay &&
          (buyer.currentLeadsToday || 0) >= buyer.maxLeadsPerDay
        ) {
          console.log(
            `✗ Buyer ${buyer._id} has reached daily lead limit (${buyer.currentLeadsToday}/${buyer.maxLeadsPerDay})`,
          );
          continue;
        }

        // Perform auto-purchase
        console.log(`✅ Attempting auto-purchase for buyer ${buyer._id}`);
        const purchaseResult = await autoPurchaseLead(lead, buyer, seller);

        if (purchaseResult.success) {
          result.purchasedByBuyers.push({
            buyerId: buyer._id.toString(),
            buyerEmail: buyer.email,
            success: true,
          });

          console.log(
            `✅ Lead ${lead._id} auto-purchased by buyer ${buyer._id}`,
          );

          // Send notification to buyer
          try {
            const leadName =
              lead.fields?.find((f) => f.label.toLowerCase() === "name")
                ?.value || "Unknown Lead";

            await sendNotification({
              userId: buyer._id.toString(),
              type: "alert",
              title: "Lead Auto-Purchased",
              message: `Lead automatically purchased: ${leadName}. Units deducted: ${lead.unit || 0}`,
              metadata: {
                leadId: lead._id,
                leadName,
                unitsCost: lead.unit || 0,
                autoPurchased: true,
              },
            });
          } catch (notifError) {
            console.error(
              "Error sending auto-purchase notification:",
              notifError,
            );
          }

          // Send notification to seller
          try {
            await sendNotification({
              userId: toIdString(seller._id),
              type: "alert",
              title: "Lead Auto-Purchased",
              message: `Lead auto-purchased by ${buyer.name || buyer.email}. Units received: ${lead.unit || 0}`,
              metadata: {
                leadId: lead._id,
                buyerId: buyer._id,
                unitsEarned: lead.unit || 0,
              },
            });
          } catch (notifError) {
            console.error(
              "Error sending seller auto-purchase notification:",
              notifError,
            );
          }

          // If lead was sold to one buyer, stop processing (lead is sold)
          if (!(lead.shareNumber && lead.shareNumber > 1)) {
            break;
          }
        } else {
          result.purchasedByBuyers.push({
            buyerId: buyer._id.toString(),
            buyerEmail: buyer.email,
            success: false,
            reason: purchaseResult.error || "Unknown error",
          });

          result.errors.push({
            buyerId: buyer._id.toString(),
            error: purchaseResult.error || "Failed to auto-purchase",
          });
        }
      } catch (buyerError) {
        console.error(
          `Error processing auto-accept for buyer ${buyer._id}:`,
          buyerError,
        );
        result.errors.push({
          buyerId: buyer._id.toString(),
          error:
            buyerError instanceof Error ? buyerError.message : "Unknown error",
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error processing auto-accept purchases:", error);
    result.errors.push({
      buyerId: "system",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}
