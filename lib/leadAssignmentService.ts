/**
 * Lead Assignment & Distribution Service
 * Handles automatic lead assignment and notifications based on seller settings and buyer criteria
 *
 * This replaces the separate AutomationWorkflow system with embedded logic that runs
 * automatically when leads are received.
 */

import { Lead, ILead } from "@/models/leads";
import { Buyer, IBuyer } from "@/models/leadbuyers";
import Form from "@/models/form";
import { User } from "@/models";
import { sendNotification } from "@/lib/notificationService";
import {
  processAutoAcceptPurchases,
  AutoPurchaseResult,
} from "@/lib/autoAcceptPurchaseService";
import {
  makeLeadAvailableInMarketplace,
  MarketplaceNotificationResult,
} from "@/lib/marketplaceNotificationService";
import dbConnect from "@/lib/connectdb";

export interface AssignmentResult {
  assignedBuyers: Array<{
    buyerId: string;
    buyerEmail: string;
    reason: string;
  }>;
  notified: Array<{
    userId: string;
    channels: string[];
    type: string;
  }>;
  errors: Array<{
    step: string;
    error: string;
  }>;
}

/**
 * Check if a buyer's criteria matches the lead
 */
function matchesBuyerCriteria(
  lead: ILead,
  buyer: IBuyer,
  reasons?: string[],
  resolvedIndustry?: string,
): boolean {
  // Check buyer's preferred distribution mode
  // If buyer only wants "Manual", skip auto-assignment
  if (buyer.preferredDistribution === "Manual") {
    if (reasons) {
      reasons.push("Buyer prefers manual distribution only");
    }
    return false;
  }

  // Check if buyer accepts call leads (if the lead came from a call source)
  const isCallLead =
    lead.leadSource?.toLowerCase().includes("call") ||
    (lead.calls && lead.calls.length > 0);
  if (isCallLead && buyer.acceptCallLeads === false) {
    if (reasons) {
      reasons.push("Buyer does not accept call-sourced leads");
    }
    return false;
  }

  // Check lead type preference (exclusive vs shared)
  if (buyer.leadTypes && buyer.leadTypes.length > 0) {
    const leadType = lead.exclusive ? "exclusive" : "shared";
    if (!buyer.leadTypes.includes(leadType)) {
      if (reasons) {
        reasons.push(
          `Lead type mismatch (lead: ${leadType}, buyer wants: ${buyer.leadTypes.join(", ")})`,
        );
      }
      return false;
    }
  }

  // Check max lead age (freshness)
  if (buyer.maxLeadAge && buyer.maxLeadAge > 0 && lead.createdAt) {
    const leadAgeHours =
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
    if (leadAgeHours > buyer.maxLeadAge) {
      if (reasons) {
        reasons.push(
          `Lead too old (${Math.round(leadAgeHours)}h > max ${buyer.maxLeadAge}h)`,
        );
      }
      return false;
    }
  }

  // Check if buyer is in vacation mode
  if (buyer.vacationMode?.enabled) {
    const now = new Date();
    if (!buyer.vacationMode.pauseUntil || buyer.vacationMode.pauseUntil > now) {
      if (buyer.vacationMode.autoReject) {
        if (reasons) {
          reasons.push("Vacation mode auto-reject is enabled");
        }
        return false; // Auto-reject during vacation
      }
    }
  }

  // Check qualification score minimum
  // Map qualityLevel to numeric score for backward compatibility: High (100), Medium (60), Low (30)
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
    if (reasons) {
      reasons.push(
        `Lead quality score ${leadQualityScore} below buyer minimum ${buyer.qualificationScoreMinimum}`,
      );
    }
    return false;
  }

  // Check if buyer is active
  if (!buyer.isActive || buyer.status === "suspended") {
    if (reasons) {
      reasons.push("Buyer is inactive or suspended");
    }
    return false;
  }

  // Check daily limits
  if (buyer.maxLeadsPerDay && buyer.currentLeadsToday >= buyer.maxLeadsPerDay) {
    if (reasons) {
      reasons.push(
        `Daily lead limit reached (${buyer.currentLeadsToday}/${buyer.maxLeadsPerDay})`,
      );
    }
    return false;
  }

  // Check max concurrent leads limit
  if (
    buyer.maxConcurrentLeads &&
    buyer.currentLeads >= buyer.maxConcurrentLeads
  ) {
    if (reasons) {
      reasons.push(
        `Concurrent lead limit reached (${buyer.currentLeads}/${buyer.maxConcurrentLeads})`,
      );
    }
    return false;
  }

  // Check period-based volume limit
  if (buyer.volumeLimitCount && buyer.volumeLimitCount > 0) {
    if (buyer.currentPeriodCount >= buyer.volumeLimitCount) {
      if (reasons) {
        reasons.push(
          `Period volume limit exceeded (${buyer.currentPeriodCount}/${buyer.volumeLimitCount})`,
        );
      }
      return false; // Exceeded period volume limit
    }
  }

  // Check period-based budget limit
  if (buyer.budgetLimitAmount && buyer.budgetLimitAmount > 0) {
    const estimatedCost = buyer.maxPricePerLead || 0;
    if (buyer.currentPeriodSpent + estimatedCost > buyer.budgetLimitAmount) {
      if (reasons) {
        reasons.push(
          `Budget limit exceeded (${buyer.currentPeriodSpent} + ${estimatedCost} > ${buyer.budgetLimitAmount})`,
        );
      }
      return false; // Would exceed period budget
    }
  }

  // Check industry preferences (multiple industries supported)
  const industryToMatch = resolvedIndustry || lead.industry;

  const preferenceChecks: Array<{
    name: string;
    matched: boolean;
  }> = [];

  if (
    buyer.leadPreferences?.industries &&
    buyer.leadPreferences.industries.length > 0 &&
    industryToMatch
  ) {
    const industryMatch = buyer.leadPreferences.industries.some(
      (industry) => industry.toLowerCase() === industryToMatch.toLowerCase(),
    );
    if (!industryMatch) {
      if (reasons) {
        reasons.push(
          `Industry mismatch (lead: ${industryToMatch}, preferred: ${buyer.leadPreferences.industries.join(", ")})`,
        );
      }
    }
    preferenceChecks.push({
      name: "industry",
      matched: industryMatch,
    });
  }

  // Check industry-service pairs (more granular than industry-only)
  // If buyer has industryServicePairs configured, check that the lead's industry
  // matches AND (optionally) the lead's service/niche matches one of the buyer's services
  if (
    buyer.leadPreferences?.industryServicePairs &&
    buyer.leadPreferences.industryServicePairs.length > 0 &&
    industryToMatch
  ) {
    const pairMatch = buyer.leadPreferences.industryServicePairs.some(
      (pair) => {
        if (pair.industry.toLowerCase() !== industryToMatch.toLowerCase()) {
          return false;
        }
        // If the pair has no specific services, industry match is enough
        if (!pair.services || pair.services.length === 0) {
          return true;
        }
        // If lead has a leadSource or field that indicates a service, match it
        const leadService =
          lead.leadSource ||
          lead.fields?.find(
            (f) =>
              f.label.toLowerCase().includes("service") ||
              f.label.toLowerCase().includes("niche"),
          )?.value;
        if (!leadService) {
          return true; // No service info on lead — industry match is enough
        }
        return pair.services.some(
          (s) => s.toLowerCase() === String(leadService).toLowerCase(),
        );
      },
    );

    if (!pairMatch) {
      if (reasons) {
        reasons.push(
          `Industry-service pair mismatch (lead industry: ${industryToMatch})`,
        );
      }
    }
    preferenceChecks.push({
      name: "industryServicePair",
      matched: pairMatch,
    });
  }

  // Check location preferences (if strict matching enabled)
  if (
    buyer.locationMatchingStrict &&
    lead.location &&
    buyer.serviceLocations &&
    buyer.serviceLocations.length > 0
  ) {
    const leadCity = lead.location.city?.toLowerCase();
    const leadState = lead.location.state?.toLowerCase();
    const leadZip = lead.location.zipCode;

    const locationMatch = buyer.serviceLocations.some((sl) => {
      // City and state match
      const cityMatch = sl.city?.toLowerCase() === leadCity;
      const stateMatch = !sl.state || sl.state.toLowerCase() === leadState;

      // Zip code match (if specified)
      const zipMatch =
        !sl.zipCodes ||
        sl.zipCodes.length === 0 ||
        (leadZip && sl.zipCodes.includes(leadZip));

      return cityMatch && stateMatch && zipMatch;
    });

    if (!locationMatch) {
      if (reasons) {
        reasons.push(
          `Location mismatch (lead: ${leadCity || ""}${leadCity && leadState ? ", " : ""}${leadState || ""}${leadZip ? ` ${leadZip}` : ""})`,
        );
      }
    }

    preferenceChecks.push({
      name: "serviceLocation",
      matched: locationMatch,
    });
  }

  // Check preferred zones (geographic preferences)
  if (
    buyer.preferredZones &&
    buyer.preferredZones.length > 0 &&
    lead.location
  ) {
    const leadCity = lead.location.city?.toLowerCase();
    const leadState = lead.location.state?.toLowerCase();
    const leadZip = lead.location.zipCode;

    const isInPreferredZone = buyer.preferredZones.some((zone) => {
      const cityMatch = zone.city && zone.city.toLowerCase() === leadCity;
      const stateMatch = zone.state && zone.state.toLowerCase() === leadState;
      const zipMatch =
        zone.zipCodes && leadZip && zone.zipCodes.includes(leadZip);

      return cityMatch || stateMatch || zipMatch;
    });

    if (!isInPreferredZone) {
      if (reasons) {
        reasons.push("Lead location not in preferred zones");
      }
    }

    preferenceChecks.push({
      name: "preferredZone",
      matched: isInPreferredZone,
    });
  }

  // Check zip code preferences (explicit zip lists in preferred zones or service locations)
  if (lead.location?.zipCode) {
    const leadZip = lead.location.zipCode;
    const preferredZipMatch =
      (buyer.preferredZones || []).some(
        (zone) => zone.zipCodes && zone.zipCodes.includes(leadZip),
      ) ||
      (buyer.serviceLocations || []).some(
        (sl) => sl.zipCodes && sl.zipCodes.includes(leadZip),
      );

    const hasZipPreferences =
      (buyer.preferredZones || []).some(
        (zone) => zone.zipCodes && zone.zipCodes.length > 0,
      ) ||
      (buyer.serviceLocations || []).some(
        (sl) => sl.zipCodes && sl.zipCodes.length > 0,
      );

    if (hasZipPreferences) {
      if (!preferredZipMatch && reasons) {
        reasons.push(`Zip code mismatch (lead: ${leadZip})`);
      }

      preferenceChecks.push({
        name: "zipCode",
        matched: preferredZipMatch,
      });
    }
  }

  // Check wallet unit balance if there's a cost
  const estimatedCost = lead.unit || buyer.maxPricePerLead || 0;
  if (estimatedCost > 0) {
    if (buyer.walletUnit < estimatedCost) {
      if (reasons) {
        reasons.push(
          `Insufficient wallet units (${buyer.walletUnit} < ${estimatedCost})`,
        );
      }
      return false;
    }
  }

  // Apply overall preference matching threshold
  if (preferenceChecks.length > 0) {
    const matchedCount = preferenceChecks.filter((p) => p.matched).length;
    const matchRatio = matchedCount / preferenceChecks.length;
    const thresholdMap: Record<string, number> = {
      strict: 0.7,
      moderate: 0.5,
      flexible: 0.2,
    };
    const required =
      thresholdMap[buyer.preferenceMatchingThreshold || "moderate"] ?? 0.5;

    if (matchRatio < required) {
      if (reasons) {
        reasons.push(
          `Preference match ${Math.round(matchRatio * 100)}% below required ${Math.round(required * 100)}% (${buyer.preferenceMatchingThreshold || "moderate"})`,
        );
      }
      return false;
    }
  }

  // Check if buyer accepts leads only during business hours
  if (buyer.acceptOnlyDuringBusinessHours) {
    // Get current time in buyer's timezone (or fallback to server time)
    let now: Date;
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

      const currentHour = parseInt(hourPart?.value || "0", 10);
      const currentMinute = parseInt(minutePart?.value || "0", 10);
      const currentTime = currentHour * 60 + currentMinute;
      const dayName = weekdayPart?.value || "";

      const isWeekend = dayName === "Saturday" || dayName === "Sunday";

      // Check weekly schedule first (more granular than simple workingHours)
      if (buyer.weeklySchedule) {
        const daySchedule =
          buyer.weeklySchedule instanceof Map
            ? buyer.weeklySchedule.get(dayName)
            : (buyer.weeklySchedule as any)[dayName];

        if (daySchedule) {
          if (!daySchedule.enabled) {
            if (reasons) {
              reasons.push(`Buyer's ${dayName} schedule is disabled`);
            }
            return false;
          }
          const [schStartH, schStartM] = daySchedule.start
            .split(":")
            .map(Number);
          const [schEndH, schEndM] = daySchedule.end.split(":").map(Number);
          const schStart = schStartH * 60 + schStartM;
          const schEnd = schEndH * 60 + schEndM;

          if (currentTime < schStart || currentTime > schEnd) {
            if (reasons) {
              reasons.push(
                `Outside ${dayName} schedule (${daySchedule.start}-${daySchedule.end}, buyer TZ: ${buyer.timezone || "America/New_York"})`,
              );
            }
            return false;
          }
        } else {
          // No specific day schedule — fall through to simple workingHours check below
          if (isWeekend && !buyer.notifyOnWeekends) {
            if (reasons) {
              reasons.push(
                "Lead submitted on weekend and buyer does not accept weekends",
              );
            }
            return false;
          }

          const [startHour, startMinute] = buyer.workingHours.start
            .split(":")
            .map(Number);
          const [endHour, endMinute] = buyer.workingHours.end
            .split(":")
            .map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;

          if (currentTime < startTime || currentTime > endTime) {
            if (reasons) {
              reasons.push(
                `Outside business hours (${buyer.workingHours.start}-${buyer.workingHours.end}, buyer TZ: ${buyer.timezone || "America/New_York"})`,
              );
            }
            return false;
          }
        }
      } else {
        // No weekly schedule — use simple workingHours
        if (isWeekend && !buyer.notifyOnWeekends) {
          if (reasons) {
            reasons.push(
              "Lead submitted on weekend and buyer does not accept weekends",
            );
          }
          return false;
        }

        const [startHour, startMinute] = buyer.workingHours.start
          .split(":")
          .map(Number);
        const [endHour, endMinute] = buyer.workingHours.end
          .split(":")
          .map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        if (currentTime < startTime || currentTime > endTime) {
          if (reasons) {
            reasons.push(
              `Outside business hours (${buyer.workingHours.start}-${buyer.workingHours.end})`,
            );
          }
          return false;
        }
      }
    } catch {
      // Fallback to server time if timezone parsing fails
      now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;

      if (isWeekend && !buyer.notifyOnWeekends) {
        if (reasons) {
          reasons.push(
            "Lead submitted on weekend and buyer does not accept weekends",
          );
        }
        return false;
      }

      const [startHour, startMinute] = buyer.workingHours.start
        .split(":")
        .map(Number);
      const [endHour, endMinute] = buyer.workingHours.end
        .split(":")
        .map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      if (currentTime < startTime || currentTime > endTime) {
        if (reasons) {
          reasons.push(
            `Outside business hours (${buyer.workingHours.start}-${buyer.workingHours.end})`,
          );
        }
        return false;
      }
    }
  }

  return true;
}

/**
 * Get matching buyers for a lead based on their criteria
 */
async function getMatchingBuyers(
  lead: ILead,
  sellerId: string,
): Promise<IBuyer[]> {
  try {
    const matchingBuyers: IBuyer[] = [];
    const comparisonLog: Array<{
      buyerId?: string;
      buyerEmail?: string;
      reasons: string[];
      preferences: Record<string, unknown>;
    }> = [];

    const formIndustry = lead.formId
      ? (
          await Form.findById(lead.formId)
            .select("industry")
            .lean<{ industry?: string }>()
        )?.industry
      : undefined;
    const resolvedIndustry = formIndustry || lead.industry;

    // Find all active buyers registered with this seller
    const buyers = await Buyer.find({
      registeredWith: sellerId,
      isActive: true,
      status: { $ne: "suspended" },
    }).lean();

    for (const buyer of buyers) {
      const reasons: string[] = [];
      const isMatch = matchesBuyerCriteria(
        lead,
        buyer as IBuyer,
        reasons,
        resolvedIndustry,
      );
      if (isMatch) {
        matchingBuyers.push(buyer as IBuyer);
      } else {
        comparisonLog.push({
          buyerId: buyer._id?.toString(),
          buyerEmail: (buyer as IBuyer).email,
          reasons,
          preferences: {
            qualificationScoreMinimum: (buyer as IBuyer)
              .qualificationScoreMinimum,
            leadQualityScore: lead.qualityLevel,
            leadIndustry: resolvedIndustry,
            industries: (buyer as IBuyer).leadPreferences?.industries || [],
            locationMatchingStrict: (buyer as IBuyer).locationMatchingStrict,
            serviceLocationsCount:
              (buyer as IBuyer).serviceLocations?.length || 0,
            preferredZonesCount: (buyer as IBuyer).preferredZones?.length || 0,
            preferenceMatchingThreshold: (buyer as IBuyer)
              .preferenceMatchingThreshold,
            maxLeadsPerDay: (buyer as IBuyer).maxLeadsPerDay,
            currentLeadsToday: (buyer as IBuyer).currentLeadsToday,
            maxConcurrentLeads: (buyer as IBuyer).maxConcurrentLeads,
            currentLeads: (buyer as IBuyer).currentLeads,
            volumeLimitCount: (buyer as IBuyer).volumeLimitCount,
            currentPeriodCount: (buyer as IBuyer).currentPeriodCount,
            budgetLimitAmount: (buyer as IBuyer).budgetLimitAmount,
            currentPeriodSpent: (buyer as IBuyer).currentPeriodSpent,
            maxPricePerLead: (buyer as IBuyer).maxPricePerLead,
            leadUnit: lead.unit,
            walletUnit: (buyer as IBuyer).walletUnit,
            acceptOnlyDuringBusinessHours: (buyer as IBuyer)
              .acceptOnlyDuringBusinessHours,
            notifyOnWeekends: (buyer as IBuyer).notifyOnWeekends,
            workingHours: (buyer as IBuyer).workingHours,
          },
        });
      }
    }

    // Sort by priority (higher priority first)
    matchingBuyers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (matchingBuyers.length === 0) {
      console.log("🔎 Buyer match evaluation (no matches)", {
        leadId: lead._id,
        leadSummary: {
          industry: resolvedIndustry,
          leadSource: lead.leadSource,
          location: lead.location,
          qualityLevel: lead.qualityLevel,
          aiQualityScore: lead.aiQualityScore,
        },
        comparisons: comparisonLog,
      });
    }

    return matchingBuyers;
  } catch (error) {
    console.error("Error getting matching buyers:", error);
    return [];
  }
}

/**
 * Assign lead to a buyer
 */
async function assignLeadToBuyer(lead: ILead, buyer: IBuyer): Promise<boolean> {
  try {
    // Update lead assignment
    await Lead.findByIdAndUpdate(lead._id, {
      $push: {
        assignedTo: {
          buyerId: buyer._id.toString(),
          accepted: false,
          rejected: false,
          assignedAt: new Date(),
        },
      },
      status: "assigned",
    });

    // Update buyer's assigned leads
    await Buyer.findByIdAndUpdate(buyer._id, {
      $push: { assignedLeads: lead._id },
      currentLeads: (buyer.currentLeads || 0) + 1,
      currentLeadsToday: (buyer.currentLeadsToday || 0) + 1,
      lastAssignedAt: new Date(),
      lastAssignedLeadId: lead._id.toString(),
    });

    return true;
  } catch (error) {
    console.error("Error assigning lead to buyer:", error);
    return false;
  }
}

/**
 * Send notifications to a buyer about assigned lead
 */
async function notifyBuyer(buyer: IBuyer, lead: ILead): Promise<string[]> {
  const notifiedChannels: string[] = [];

  try {
    const leadName =
      lead.fields?.find((f) => f.label.toLowerCase() === "name")?.value ||
      "Unknown";
    const leadEmail =
      lead.fields?.find((f) => f.label.toLowerCase() === "email")?.value ||
      "N/A";
    const leadPhone =
      lead.fields?.find((f) => f.label.toLowerCase() === "phone")?.value ||
      "N/A";

    // Determine if lead contact details should be shown
    // Show details if buyer has auto-accept enabled or has already accepted
    const buyerAssignment = lead.assignedTo?.find(
      (a: any) => a.buyerId.toString() === buyer._id.toString(),
    );
    const showContactDetails =
      buyer.autoAcceptMatchingLeads || buyerAssignment?.accepted;

    const contactDetailsMessage = showContactDetails
      ? `Name: ${leadName}, Email: ${leadEmail}, Phone: ${leadPhone}`
      : "[Contact details hidden until you accept this lead]";

    // Build the notification message
    const notificationMessage = `New lead assigned: ${leadName}. ${contactDetailsMessage}${
      !buyer.autoAcceptMatchingLeads
        ? ". Click to review and accept/reject."
        : ""
    }`;

    // Send dashboard notification
    await sendNotification({
      userId: buyer._id.toString(),
      type: "alert",
      title: "New Lead Assignment",
      message: notificationMessage,
      metadata: {
        leadId: lead._id,
        leadName,
        leadEmail: showContactDetails ? leadEmail : "[hidden]",
        leadPhone: showContactDetails ? leadPhone : "[hidden]",
        qualityLevel: lead.qualityLevel,
        status: lead.status,
        requiresAcceptance: !buyer.autoAcceptMatchingLeads,
      },
    });
    notifiedChannels.push("dashboard");

    // Send email if buyer has email notifications enabled
    if (buyer.notificationPreferences?.includes("Email") && buyer.email) {
      // The email will be sent automatically by sendNotification for the buyer user
      notifiedChannels.push("email");
      console.log(
        `📧 Email notification queued for buyer ${buyer.email} about lead ${lead._id}`,
      );
    }

    // Send SMS if enabled
    if (buyer.notificationPreferences?.includes("SMS") && buyer.phone) {
      notifiedChannels.push("sms");
      console.log(
        `📱 SMS notification queued for buyer ${buyer.phone} about lead ${lead._id}`,
      );
    }

    return notifiedChannels;
  } catch (error) {
    console.error("Error notifying buyer:", error);
    return notifiedChannels;
  }
}

/**
 * Main function: Process lead and handle automatic assignment and notifications
 * Called automatically when a lead is received
 */
export async function processLeadDistribution(
  lead: ILead,
): Promise<AssignmentResult> {
  await dbConnect();

  const result: AssignmentResult = {
    assignedBuyers: [],
    notified: [],
    errors: [],
  };

  try {
    const sellerId = lead.userId.toString();

    // ========================================
    // 1. GET MATCHING BUYERS
    // ========================================
    const matchingBuyers = await getMatchingBuyers(lead, sellerId);

    if (matchingBuyers.length === 0) {
      try {
        await Lead.findByIdAndUpdate(lead._id, {
          status: "available",
        });
      } catch (error) {
        console.error(
          `Error updating lead ${lead._id} status to available:`,
          error,
        );
        result.errors.push({
          step: "mark_lead_available",
          error: String(error),
        });
      }
      console.log(
        `ℹ️ No matching buyers found for lead ${lead._id}. Lead remains available for manual assignment.`,
      );
      return result;
    }

    console.log(
      `📋 Found ${matchingBuyers.length} matching buyers for lead ${lead._id}`,
    );

    // ========================================
    // 2. GET SELLER PREFERENCES FOR DISTRIBUTION
    // ========================================
    let seller;
    try {
      seller = await User.findById(sellerId).select(
        "autoAssignLeads maxAutoAssignPerDay currentAutoAssignedToday distributionMode aiQualityThreshold industryRoundRobinIndex lastAssignedIndex",
      );
    } catch (error) {
      result.errors.push({
        step: "fetch_seller_preferences",
        error: "Failed to fetch seller preferences",
      });
      seller = null;
    }

    const autoAssignEnabled = (seller as any)?.autoAssignLeads === true;
    const distributionMode = (seller as any)?.distributionMode || "marketplace";
    const aiQualityThreshold = (seller as any)?.aiQualityThreshold ?? 50;

    // Calculate whether this lead should be auto-assigned based on mode
    const shouldAutoAssign = (() => {
      if (!autoAssignEnabled) return false;
      if (distributionMode === "automatic") return true;
      if (distributionMode === "marketplace") return false;
      // both: auto-assign only if AI spam/quality score meets threshold (lower is better)
      const aiScore =
        typeof lead.aiQualityScore === "number" ? lead.aiQualityScore : null;
      if (aiScore !== null) {
        return aiScore <= aiQualityThreshold;
      }
      // Fallback: use qualityLevel if AI score absent
      const qualityLevel = lead.qualityLevel || "Medium";
      return qualityLevel === "High" || qualityLevel === "Medium";
    })();

    if (!shouldAutoAssign) {
      console.log(
        `ℹ️ Auto-assignment skipped (mode=${distributionMode}) for seller ${sellerId}. Moving to marketplace.`,
      );

      // Make lead available in marketplace
      try {
        const marketplaceResult = await makeLeadAvailableInMarketplace(
          lead,
          "unmatched",
        );
        console.log(
          `📢 Lead ${lead._id} made available in marketplace. Notified ${marketplaceResult.notificationResult?.notifiedBuyers?.length || 0} buyers.`,
        );
      } catch (error) {
        console.error("Error making lead available in marketplace:", error);
        result.errors.push({
          step: "marketplace_availability",
          error: String(error),
        });
      }

      // Trigger auto-accept purchases for buyers with auto-accept enabled
      try {
        const autoPurchaseResult = await processAutoAcceptPurchases(lead);
        console.log(
          `💰 Auto-purchase processing: ${autoPurchaseResult.purchasedByBuyers.filter((r: any) => r.success).length} purchased, ${autoPurchaseResult.purchasedByBuyers.filter((r: any) => !r.success).length} failed`,
        );
        result.assignedBuyers.push(
          ...autoPurchaseResult.purchasedByBuyers
            .filter((r: any) => r.success)
            .map((r: any) => ({
              buyerId: r.buyerId,
              buyerEmail: r.buyerEmail || "",
              reason: "Auto-purchased from marketplace",
            })),
        );
      } catch (error) {
        console.error("Error processing auto-accept purchases:", error);
        result.errors.push({
          step: "auto_accept_purchases",
          error: String(error),
        });
      }

      // Notify seller
      try {
        await sendNotification({
          userId: sellerId,
          type: "alert",
          title: "Lead Made Available in Marketplace",
          message: `Lead is now available in the marketplace for buyer purchase. ${result.assignedBuyers.length} buyer(s) have auto-purchased so far.`,
          metadata: {
            leadId: lead._id,
            autoPurchasedCount: result.assignedBuyers.length,
          },
        });
      } catch (error) {
        result.errors.push({
          step: "notify_seller_marketplace",
          error: String(error),
        });
      }

      return result;
    }

    // ========================================
    // 3. AUTO-ASSIGN LEAD (if enabled)
    // ========================================

    // Get seller's auto-assignment limit
    const maxAutoAssignPerDay = (seller as any)?.maxAutoAssignPerDay || 50;
    const currentAutoAssignedToday =
      (seller as any)?.currentAutoAssignedToday || 0;

    if (currentAutoAssignedToday >= maxAutoAssignPerDay) {
      console.log(
        `⚠️ Seller ${sellerId} has reached daily auto-assignment limit`,
      );
      result.errors.push({
        step: "auto_assign",
        error: "Seller has reached daily auto-assignment limit",
      });
    } else {
      // Choose first matching buyer for assignment
      let primaryBuyer = matchingBuyers[0];

      const assigned = await assignLeadToBuyer(lead, primaryBuyer);

      if (assigned) {
        result.assignedBuyers.push({
          buyerId: primaryBuyer._id.toString(),
          buyerEmail: primaryBuyer.email,
          reason: "Auto-assigned (highest priority match)",
        });

        console.log(
          `✅ Lead ${lead._id} auto-assigned to buyer ${primaryBuyer._id}`,
        );

        // Notify the buyer
        const channels = await notifyBuyer(primaryBuyer, lead);
        result.notified.push({
          userId: primaryBuyer._id.toString(),
          channels,
          type: "lead_assigned",
        });

        // Update seller's daily count
        try {
          await User.findByIdAndUpdate(sellerId, {
            $inc: { currentAutoAssignedToday: 1 },
          });
        } catch (error) {
          result.errors.push({
            step: "update_seller_count",
            error: "Failed to update seller auto-assignment count",
          });
        }

        // ============================================================
        // Handle Auto-Accept Logic for the Assigned Buyer
        // ============================================================
        const estimatedCost = lead.unit || 0;
        if (primaryBuyer.autoAcceptMatchingLeads && estimatedCost > 0) {
          // Auto-debit the buyer's wallet units
          try {
            await Buyer.findByIdAndUpdate(primaryBuyer._id, {
              $inc: { walletUnit: -estimatedCost },
            });

            // Mark assignment as accepted in the assignedTo array
            await Lead.findByIdAndUpdate(
              lead._id,
              {
                $set: {
                  "assignedTo.$[elem].accepted": true,
                },
                $push: {
                  soldTo: {
                    buyerId: primaryBuyer._id.toString(),
                    createdAt: new Date(),
                    unit: estimatedCost,
                  },
                },
              },
              {
                arrayFilters: [{ "elem.buyerId": primaryBuyer._id.toString() }],
              },
            );

            // Update lead status to 'sold' since it's auto-accepted
            await Lead.findByIdAndUpdate(lead._id, {
              status: "sold",
              $inc: { soldCount: 1 },
            });

            console.log(
              `💳 Auto-accepted lead ${lead._id}: ${estimatedCost} units debited from buyer ${primaryBuyer._id}`,
            );

            result.assignedBuyers[result.assignedBuyers.length - 1].reason =
              "Auto-assigned and auto-accepted (units debited)";
          } catch (error) {
            console.error(
              `Error processing auto-accept debit for buyer ${primaryBuyer._id}:`,
              error,
            );
            result.errors.push({
              step: "auto_accept_debit",
              error: String(error),
            });
          }
        }

        // ============================================================
        // Handle Shared Lead Distribution
        // ============================================================
        // Only make available in marketplace if lead is marked as 'shared'
        if (lead.shared) {
          const sharedCount = lead.shareNumber || 1;
          const alreadyAssigned = 1; // We just assigned to primaryBuyer

          if (alreadyAssigned < sharedCount) {
            // Find additional matching buyers for shared distribution
            const additionalBuyers = matchingBuyers.slice(1, sharedCount);

            for (const additionalBuyer of additionalBuyers) {
              const additionalAssigned = await assignLeadToBuyer(
                lead,
                additionalBuyer as IBuyer,
              );

              if (additionalAssigned) {
                result.assignedBuyers.push({
                  buyerId: additionalBuyer._id?.toString() || "",
                  buyerEmail: (additionalBuyer as IBuyer).email,
                  reason: "Shared lead - auto-assigned (round-robin)",
                });

                console.log(
                  `✅ Shared lead ${lead._id} also assigned to buyer ${additionalBuyer._id} (${alreadyAssigned + 1}/${sharedCount})`,
                );

                // Notify this additional buyer
                const additionalChannels = await notifyBuyer(
                  additionalBuyer as IBuyer,
                  lead,
                );
                result.notified.push({
                  userId: additionalBuyer._id?.toString() || "",
                  channels: additionalChannels,
                  type: "lead_assigned",
                });

                // Handle auto-accept for additional buyers
                if (
                  (additionalBuyer as IBuyer).autoAcceptMatchingLeads &&
                  estimatedCost > 0
                ) {
                  try {
                    await Buyer.findByIdAndUpdate(additionalBuyer._id, {
                      $inc: { walletUnit: -estimatedCost },
                    });

                    console.log(
                      `💳 Shared lead auto-accepted: ${estimatedCost} units debited from buyer ${additionalBuyer._id}`,
                    );

                    const lastAssignment =
                      result.assignedBuyers[result.assignedBuyers.length - 1];
                    lastAssignment.reason =
                      "Shared lead - auto-assigned and auto-accepted (units debited)";
                  } catch (error) {
                    console.error(
                      `Error processing auto-accept for additional shared buyer:`,
                      error,
                    );
                  }
                }
              }
            }
          }

          // After shared distribution, make available in marketplace if not all slots filled
          const totalAssignments = result.assignedBuyers.filter((ab) =>
            ab.reason.includes("auto-assigned"),
          ).length;

          if (totalAssignments < sharedCount) {
            try {
              await makeLeadAvailableInMarketplace(lead, "unmatched");
              console.log(
                `📢 Shared lead ${lead._id} made available in marketplace (${totalAssignments}/${sharedCount} slots filled)`,
              );

              const autoPurchaseResult = await processAutoAcceptPurchases(lead);
              console.log(
                `💰 Auto-purchase processing: ${autoPurchaseResult.purchasedByBuyers.filter((r: any) => r.success).length} additional purchases`,
              );
              result.assignedBuyers.push(
                ...autoPurchaseResult.purchasedByBuyers
                  .filter((r: any) => r.success)
                  .map((r: any) => ({
                    buyerId: r.buyerId,
                    buyerEmail: r.buyerEmail || "",
                    reason: "Auto-purchased (shared lead - marketplace)",
                  })),
              );
            } catch (error) {
              console.error(
                "Error with shared lead marketplace availability:",
                error,
              );
            }
          }
        }
      } else {
        result.errors.push({
          step: "auto_assign",
          error: "Failed to assign lead to primary buyer",
        });

        // Fallback: If lead is shared, try to make available in marketplace
        // If exclusive, keep as "available" for manual assignment
        if (lead.shared) {
          try {
            await makeLeadAvailableInMarketplace(lead, "unmatched");
            const autoPurchaseResult = await processAutoAcceptPurchases(lead);
            result.assignedBuyers.push(
              ...autoPurchaseResult.purchasedByBuyers
                .filter((r: any) => r.success)
                .map((r: any) => ({
                  buyerId: r.buyerId,
                  buyerEmail: r.buyerEmail || "",
                  reason: "Auto-purchased (shared lead - assignment fallback)",
                })),
            );
          } catch (error) {
            console.error("Error with marketplace fallback:", error);
          }
        } else {
          // Exclusive lead: mark as available for manual assignment
          try {
            await Lead.findByIdAndUpdate(lead._id, {
              status: "available",
            });
            console.log(
              `⚠️ Exclusive lead ${lead._id} available for manual assignment (assignment to primary buyer failed)`,
            );
          } catch (error) {
            console.error("Error marking lead as available:", error);
          }
        }
      }
    }

    // ========================================
    // 4. NOTIFY SELLER ABOUT ASSIGNMENT
    // ========================================
    try {
      const assignmentMessage =
        result.assignedBuyers.length > 0
          ? `Lead assigned to ${result.assignedBuyers[0].buyerEmail}`
          : `Lead matches ${matchingBuyers.length} buyer(s) but auto-assignment is at daily limit`;

      await sendNotification({
        userId: sellerId,
        type: "alert",
        title: "Lead Distribution Update",
        message: assignmentMessage,
        metadata: {
          leadId: lead._id,
          assignedBuyersCount: result.assignedBuyers.length,
          matchingBuyersCount: matchingBuyers.length,
        },
      });

      result.notified.push({
        userId: sellerId,
        channels: ["dashboard"],
        type: "distribution_update",
      });
    } catch (error) {
      result.errors.push({
        step: "notify_seller_distribution",
        error: String(error),
      });
    }

    return result;
  } catch (error) {
    console.error("Error processing lead distribution:", error);
    result.errors.push({
      step: "process_distribution",
      error: String(error),
    });
    return result;
  }
}

/**
 * Helper function to get summary of distribution results
 */
export function getDistributionSummary(result: AssignmentResult): string {
  const assigned = result.assignedBuyers.length;
  const notified = result.notified.length;
  const errors = result.errors.length;

  return `Distribution: ${assigned} assigned, ${notified} notified, ${errors} errors`;
}
