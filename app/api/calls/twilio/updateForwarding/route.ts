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
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

import { isSellerRole } from "@/lib/roles";
const MAX_TEXT_LENGTH = 500;
const MAX_LIST_ENTRIES = 200;
const MAX_FORWARDING_NUMBERS = 10;
const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;

function isValidPhone(value: unknown): value is string {
  return (
    typeof value === "string" &&
    PHONE_PATTERN.test(value.replace(/[\s\-()]/g, ""))
  );
}

function sanitizeText(
  value: unknown,
  fallback: string,
  maxLength: number = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim().slice(0, maxLength);
}

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
    if (!isSellerRole(session.user.role) && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "twilio-update-forwarding",
      limit: 30,
      windowMs: 5 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

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
      buyerResponses: rawBuyerResponses,
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

    // Find the seller (read-only — used to check entitlements, that the
    // number exists, and to fall back to existing values for fields that
    // are only conditionally overwritten below)
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

    // Paid-feature gating: the client only shows these toggles when the
    // seller's plan includes them, but that's a UI convenience, not
    // enforcement — without this check any seller could POST directly and
    // enable call recording / transcription / AI analysis regardless of
    // subscription tier.
    const subscriptionLimits = seller.subscription?.subscriptionLimits;
    const canRecord = !!subscriptionLimits?.callRecording;
    const canUseAI = !!subscriptionLimits?.callAIAnalysis;

    const effectiveRecordCall = canRecord ? !!recordCall : false;
    const effectiveRecordingConsent = canRecord ? !!recordingConsent : false;
    const effectiveTranscriptionEnabled = canUseAI
      ? !!transcriptionEnabled
      : false;
    const effectiveAiSummaryEnabled = canUseAI ? !!aiSummaryEnabled : false;

    // Build the field set atomically via the positional operator instead of
    // mutating the in-memory subdocument and calling seller.save() — a
    // full-document save would silently overwrite any other tracking-number
    // edit (e.g. a concurrent removeNumber/dnc call) that landed on this
    // same User document between our read above and this write.
    const setFields: Record<string, unknown> = {
      "trackingNumbers.$.industry": sanitizeText(
        industry,
        number.industry || "",
        100,
      ),
      "trackingNumbers.$.forwardingType": forwardingType,
      "trackingNumbers.$.method": method || number.method,
      "trackingNumbers.$.recordCall": effectiveRecordCall,
      "trackingNumbers.$.reconnectCaller": !!reconnectCaller,
      "trackingNumbers.$.passCallerId": !!passCallerId,
      "trackingNumbers.$.leadSource": sanitizeText(leadSource, ""),
      "trackingNumbers.$.welcomeMessage": sanitizeText(welcomeMessage, ""),
      "trackingNumbers.$.callWhisper": sanitizeText(callWhisper, ""),
      "trackingNumbers.$.requireResponse": !!requireResponse,
      "trackingNumbers.$.overflowNumber": isValidPhone(overflowNumber)
        ? overflowNumber.trim()
        : "",
      "trackingNumbers.$.enableWorkingHours": !!enableWorkingHours,
      "trackingNumbers.$.workingHoursStart": workingHoursStart || "09:00",
      "trackingNumbers.$.workingHoursEnd": workingHoursEnd || "17:00",
      "trackingNumbers.$.recordingConsent": effectiveRecordingConsent,
      "trackingNumbers.$.recordingConsentMessage": sanitizeText(
        recordingConsentMessage,
        "This call may be recorded for quality assurance purposes.",
      ),
      "trackingNumbers.$.missedCallTextBack": !!missedCallTextBack,
      "trackingNumbers.$.missedCallTextMessage": sanitizeText(
        missedCallTextMessage,
        "We missed your call! We will get back to you shortly.",
      ),
      "trackingNumbers.$.dncEnabled": !!dncEnabled,
      "trackingNumbers.$.spamFilterEnabled": !!spamFilterEnabled,
      "trackingNumbers.$.spamFilterAction":
        spamFilterAction === "warn" ? "warn" : "block",
      "trackingNumbers.$.scheduledCallbackEnabled": !!scheduledCallbackEnabled,
      "trackingNumbers.$.scheduledCallbackDigit": scheduledCallbackDigit || "1",
      "trackingNumbers.$.multiRingEnabled": !!multiRingEnabled,
      "trackingNumbers.$.geoRoutingEnabled": !!geoRoutingEnabled,
      "trackingNumbers.$.concurrentCallLimit":
        typeof concurrentCallLimit === "number"
          ? Math.max(0, Math.min(100, concurrentCallLimit))
          : 0,
      "trackingNumbers.$.transcriptionEnabled": effectiveTranscriptionEnabled,
      "trackingNumbers.$.aiSummaryEnabled": effectiveAiSummaryEnabled,
    };

    const unsetFields: Record<string, ""> = {};

    if (dncList && Array.isArray(dncList)) {
      setFields["trackingNumbers.$.dncList"] = dncList
        .filter(isValidPhone)
        .map((n: string) => n.trim())
        .slice(0, MAX_LIST_ENTRIES);
    }

    let buyerResponses: ResponseEntry[] | undefined;
    if (requireResponse && Array.isArray(rawBuyerResponses)) {
      buyerResponses = rawBuyerResponses
        .filter(isResponseEntry)
        .map((res) => ({
          message: res.message.trim().slice(0, MAX_TEXT_LENGTH),
          digit: res.digit.trim().slice(0, 1),
        }));
    }
    if (buyerResponses?.length) {
      setFields["trackingNumbers.$.buyerResponses"] = buyerResponses;
    } else {
      unsetFields["trackingNumbers.$.buyerResponses"] = "";
    }

    if (forwardingType === "single_multiple" && Array.isArray(forwardingNumbers)) {
      const cleaned = forwardingNumbers
        .filter(isValidPhone)
        .map((num: string) => num.trim())
        .slice(0, MAX_FORWARDING_NUMBERS);
      if (cleaned.length) {
        setFields["trackingNumbers.$.forwardingNumbers"] = cleaned;
      } else {
        unsetFields["trackingNumbers.$.forwardingNumbers"] = "";
      }
    } else {
      unsetFields["trackingNumbers.$.forwardingNumbers"] = "";
    }

    if (forwardingType === "specific_lead" && Array.isArray(leadBuyers)) {
      const cleaned = leadBuyers.filter(isLeadBuyerEntry).map((buyer) => ({
        id: buyer.id,
        name: buyer.name,
        phone: buyer.phone || "",
      }));
      if (cleaned.length) {
        setFields["trackingNumbers.$.leadBuyers"] = cleaned;
      } else {
        unsetFields["trackingNumbers.$.leadBuyers"] = "";
      }
    } else {
      unsetFields["trackingNumbers.$.leadBuyers"] = "";
    }

    const updatedSeller = await User.findOneAndUpdate(
      { _id: targetSellerId, "trackingNumbers.phoneNumber": phoneNumber },
      {
        $set: setFields,
        ...(Object.keys(unsetFields).length ? { $unset: unsetFields } : {}),
      },
      { new: true },
    ).select("trackingNumbers");

    if (!updatedSeller) {
      // The number was removed by a concurrent request between our read and
      // this write.
      return notFound("Number");
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Forwarding settings updated successfully",
          phoneNumber,
          requireResponse,
          hasBuyerResponses: (buyerResponses ?? []).length > 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating forwarding:", error);
    return internalError("Failed to update forwarding");
  }
}
