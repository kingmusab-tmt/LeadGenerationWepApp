import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

type ResponseEntry = { message: string; digit: string };
type LeadBuyerEntry = { id: string; name: string; phone?: string };
type TrackingNumberRecord = {
  phoneNumber?: string;
  industry?: string;
  forwardingType?: string;
  method?: string;
  recordCall?: boolean;
  reconnectCaller?: boolean;
  passCallerId?: boolean;
  leadSource?: string;
  welcomeMessage?: string;
  callWhisper?: string;
  requireResponse?: boolean;
  overflowNumber?: string;
  enableWorkingHours?: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  recordingConsent?: boolean;
  recordingConsentMessage?: string;
  missedCallTextBack?: boolean;
  missedCallTextMessage?: string;
  dncEnabled?: boolean;
  dncList?: string[];
  spamFilterEnabled?: boolean;
  spamFilterAction?: "warn" | "block";
  scheduledCallbackEnabled?: boolean;
  scheduledCallbackDigit?: string;
  multiRingEnabled?: boolean;
  geoRoutingEnabled?: boolean;
  concurrentCallLimit?: number;
  transcriptionEnabled?: boolean;
  aiSummaryEnabled?: boolean;
  buyerResponses?: ResponseEntry[];
  leadResponses?: ResponseEntry[];
  forwardingNumbers?: string[];
  leadBuyers?: LeadBuyerEntry[];
};

function isResponseEntry(value: unknown): value is ResponseEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "digit" in value &&
    typeof (value as { message: unknown }).message === "string" &&
    typeof (value as { digit: unknown }).digit === "string"
  );
}

function isLeadBuyerEntry(value: unknown): value is LeadBuyerEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    typeof (value as { id: unknown }).id === "string" &&
    typeof (value as { name: unknown }).name === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user?.role) {
      return unauthorized("Authentication required");
    }
    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    await dbConnect();

    // Parse the request body with new fields
    const {
      sellerId,
      phoneNumber,
      industry,
      forwardingType,
      method,
      recordCall,
      reconnectCaller,
      passCallerId,
      leadSource,
      welcomeMessage,
      callWhisper,
      requireResponse,
      buyerResponses,
      leadResponses,
      forwardingNumbers,
      leadBuyers,
      overflowNumber,
      // Seller working hours
      enableWorkingHours,
      workingHoursStart,
      workingHoursEnd,
      // New feature flags
      recordingConsent,
      recordingConsentMessage,
      missedCallTextBack,
      missedCallTextMessage,
      dncEnabled,
      dncList,
      spamFilterEnabled,
      spamFilterAction,
      scheduledCallbackEnabled,
      scheduledCallbackDigit,
      multiRingEnabled,
      geoRoutingEnabled,
      concurrentCallLimit,
      transcriptionEnabled,
      aiSummaryEnabled,
    } = await req.json();

    const targetSellerId =
      session.user.role === "admin" && sellerId ? sellerId : session.user.id;
    if (
      session.user.role !== "admin" &&
      sellerId &&
      String(sellerId) !== String(session.user.id)
    ) {
      return forbidden("You can only update your own forwarding settings");
    }

    // Find the seller
    const seller = await User.findById(targetSellerId);
    if (!seller) {
      return notFound("Seller");
    }

    const trackingNumbers =
      seller.trackingNumbers as unknown as TrackingNumberRecord[];

    // Find the tracking number
    const number = trackingNumbers.find(
      (num) => num.phoneNumber === phoneNumber,
    );
    if (!number) {
      return notFound("Number");
    }

    // Update the tracking number fields
    number.industry = industry || number.industry;
    number.forwardingType = forwardingType;
    number.method = method || number.method;
    number.recordCall = recordCall || false;
    number.reconnectCaller = reconnectCaller || false;
    number.passCallerId = passCallerId || false;
    number.leadSource = leadSource || "";
    number.welcomeMessage = welcomeMessage || "";
    number.callWhisper = callWhisper || "";
    number.requireResponse = requireResponse || false;
    number.overflowNumber = overflowNumber || "";

    // Save working hours
    number.enableWorkingHours = !!enableWorkingHours;
    number.workingHoursStart = workingHoursStart || "09:00";
    number.workingHoursEnd = workingHoursEnd || "17:00";

    // Update new feature flags
    number.recordingConsent = !!recordingConsent;
    number.recordingConsentMessage =
      recordingConsentMessage ||
      "This call may be recorded for quality assurance purposes.";
    number.missedCallTextBack = !!missedCallTextBack;
    number.missedCallTextMessage =
      missedCallTextMessage ||
      "We missed your call! We will get back to you shortly.";
    number.dncEnabled = !!dncEnabled;
    if (dncList && Array.isArray(dncList)) {
      number.dncList = dncList
        .filter((n: string) => n && n.trim())
        .map((n: string) => n.trim());
    }
    number.spamFilterEnabled = !!spamFilterEnabled;
    number.spamFilterAction = spamFilterAction === "warn" ? "warn" : "block";
    number.scheduledCallbackEnabled = !!scheduledCallbackEnabled;
    number.scheduledCallbackDigit = scheduledCallbackDigit || "1";
    number.multiRingEnabled = !!multiRingEnabled;
    number.geoRoutingEnabled = !!geoRoutingEnabled;
    number.concurrentCallLimit =
      typeof concurrentCallLimit === "number" ? concurrentCallLimit : 0;
    number.transcriptionEnabled = !!transcriptionEnabled;
    number.aiSummaryEnabled = !!aiSummaryEnabled;

    // Handle response verification settings
    if (requireResponse) {
      // Validate and set buyer responses
      if (buyerResponses && Array.isArray(buyerResponses)) {
        number.buyerResponses = buyerResponses
          .filter(isResponseEntry)
          .map((res) => ({
            message: res.message.trim(),
            digit: res.digit.trim(),
          }));
      } else {
        number.buyerResponses = undefined;
      }

      // Validate and set lead responses
      if (leadResponses && Array.isArray(leadResponses)) {
        number.leadResponses = leadResponses
          .filter(isResponseEntry)
          .map((res) => ({
            message: res.message.trim(),
            digit: res.digit.trim(),
          }));
      } else {
        number.leadResponses = undefined;
      }
    } else {
      // Clear responses if verification is disabled
      number.buyerResponses = undefined;
      number.leadResponses = undefined;
    }

    // Update forwarding numbers (if applicable)
    if (forwardingType === "single_multiple" && forwardingNumbers) {
      number.forwardingNumbers = forwardingNumbers
        .filter((num: string) => num.trim())
        .map((num: string) => num.trim());
    } else {
      number.forwardingNumbers = undefined;
    }

    // Update lead buyers (if applicable)
    if (forwardingType === "specific_lead" && leadBuyers) {
      number.leadBuyers = leadBuyers
        .filter(isLeadBuyerEntry)
        .map((buyer: LeadBuyerEntry) => ({
          id: buyer.id,
          name: buyer.name,
          phone: buyer.phone || "", // Include phone if available
        }));
    } else {
      number.leadBuyers = undefined;
    }

    // Save the updated seller document
    await seller.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Forwarding settings updated successfully",
          phoneNumber,
          requireResponse,
          hasBuyerResponses: (number.buyerResponses ?? []).length > 0,
          hasLeadResponses: (number.leadResponses ?? []).length > 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating forwarding:", error);
    return internalError("Failed to update forwarding");
  }
}
