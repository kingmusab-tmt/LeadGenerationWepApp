// This file handles incoming calls via Twilio, processes them based on seller configurations,
// and manages call forwarding, recording, and notifications.

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import Call from "@/models/call";
import {
  debugLog,
  getDialParams,
  getWhisperUrl,
  dialWithWhisper,
  getNextRoundRobinBuyerAtomic,
  createCallRecord,
  updateAnsweredCall,
  sendNotifications,
  checkBuyerUnitBalance,
  isBuyerInBusinessHours,
  isBuyerOnVacation,
  addVoicemailToTwiml,
  addOverflowToTwiml,
} from "@/utils/callHandlers";
import { callSecurityMiddleware, CALL_DEFAULTS } from "@/lib/security/callSecurity";
import { dispatchCallWebhook } from "@/lib/integrations/callWebhookDispatcher";
import { env } from "@/lib/env";
import {
  checkSpamStatus,
  isOnDncList,
  sendMissedCallTextBack,
  extractGeoData,
  doesBuyerServiceArea,
  isBuyerAtConcurrentLimit,
  markCallActive,
  markCallInactive,
} from "@/utils/callFeatureServices";
import { processCallAIAnalysis } from "@/lib/callAIAnalysis";

type LeadBuyerRef = {
  id: string;
  phone: string;
};

type BuyerResponse = {
  message: string;
  digit: string;
};

type TrackingNumberConfig = {
  phoneNumber: string;
  industry: string;
  forwardingType: "direct" | "single_multiple" | "specific_lead";
  forwardingNumbers: string[];
  leadBuyers: LeadBuyerRef[];
  recordCall: boolean;
  welcomeMessage?: string;
  passCallerId: boolean;
  callWhisper?: string;
  requireResponse: boolean;
  buyerResponses?: BuyerResponse[];
  overflowNumber?: string;
  enableWorkingHours: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  recordingConsent: boolean;
  recordingConsentMessage?: string;
  missedCallTextBack: boolean;
  missedCallTextMessage?: string;
  dncEnabled: boolean;
  dncList?: string[];
  spamFilterEnabled: boolean;
  spamFilterAction?: "block" | "warn";
  scheduledCallbackEnabled: boolean;
  scheduledCallbackDigit?: string;
  multiRingEnabled: boolean;
  geoRoutingEnabled: boolean;
  concurrentCallLimit: number;
  reconnectCaller: boolean;
  transcriptionEnabled?: boolean;
  aiSummaryEnabled?: boolean;
  leadSource?: string;
};

function appendSingleMultipleIndex(actionUrl: string, index?: number): string {
  if (typeof index !== "number" || !Number.isInteger(index)) {
    return actionUrl;
  }

  const separator = actionUrl.includes("?") ? "&" : "?";
  return `${actionUrl}${separator}singleMultipleIndex=${index}`;
}

// Tracks which lead buyers have already been dialed for a "specific_lead"
// sequential call, the same way singleMultipleIndex tracks position for
// "single_multiple" — needed because only the first sibling <Dial> in any
// given TwiML response ever actually rings (see appendSingleMultipleIndex's
// call sites), so advancing to the next lead buyer on no-answer requires
// remembering who was already tried rather than relying on unreachable
// sibling verbs.
function appendTriedLeadBuyerIds(actionUrl: string, ids: string[]): string {
  const filtered = ids.filter(Boolean);
  if (filtered.length === 0) return actionUrl;
  const separator = actionUrl.includes("?") ? "&" : "?";
  return `${actionUrl}${separator}triedLeadBuyerIds=${encodeURIComponent(filtered.join(","))}`;
}

/**
 * Mark a whisper/screening URL as belonging to a multi-ring dial so the
 * screening response handler only hangs up the rejecting leg instead of
 * tearing down the parent call (which would cancel the other ringing legs).
 * legCount lets the response handler trigger fallback once every leg rejects.
 */
function withMultiRingScreening(
  whisperUrl: string | undefined,
  legCount: number,
): string | undefined {
  if (!whisperUrl) return whisperUrl;
  const separator = whisperUrl.includes("?") ? "&" : "?";
  return `${whisperUrl}${separator}multiRing=true&legCount=${legCount}`;
}

/**
 * Clear concurrent-call tracking for every buyer leg associated with a call.
 * Multi-ring dials mark several buyers active under one CallSid, so clearing
 * only the primary buyerId would leak the sibling legs until their Redis TTL.
 */
function markAllLegsInactive(
  call: { buyerId?: string; leadBuyers?: string[] } | null,
  callSid: string,
) {
  if (!call) return;
  const ids = new Set<string>();
  if (call.buyerId) ids.add(call.buyerId.toString());
  for (const id of call.leadBuyers ?? []) {
    if (id) ids.add(id.toString());
  }
  for (const id of ids) {
    markCallInactive(id, callSid);
  }
}

function buildBusyFallbackTwiml(callSid: string) {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(
    "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
  );
  addVoicemailToTwiml(twiml, {
    sellerId: "",
    callSid,
    message:
      "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
  });
  return twiml;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  debugLog("Incoming call request received");

  // Gracefully handle client aborts (Twilio may reset the connection on long cold starts)
  let abortedByClient = false;
  try {
    const signal = "signal" in req ? req.signal : undefined;
    if (signal) {
      signal.addEventListener("abort", () => {
        abortedByClient = true;
        debugLog("Request aborted by client", null, "warn");
      });
    }
  } catch {
    // ignore if signal isn't available
  }

  const checkAbort = () => {
    if (abortedByClient || ("signal" in req && req.signal?.aborted)) {
      debugLog("Stopping processing because request was aborted", null, "warn");
      return true;
    }
    return false;
  };

  let processingStage = "start";

  try {
    // Security checks: rate limiting + webhook signature validation
    processingStage = "security";
    if (checkAbort()) {
      debugLog(
        "Request aborted before security checks",
        { stage: processingStage },
        "warn",
      );
      return new NextResponse(null, { status: 200 });
    }

    let securityResponse;
    try {
      securityResponse = await callSecurityMiddleware(req, {
        rateLimit: true,
        validateWebhook: true,
      });
    } catch (err: unknown) {
      const errorLike = err as { message?: string; code?: string };
      // If the request was aborted while running validation, stop gracefully.
      const isAbortError =
        (typeof errorLike.message === "string" &&
          errorLike.message.includes("aborted")) ||
        errorLike.code === "ECONNRESET" ||
        ("signal" in req && req.signal?.aborted);

      if (isAbortError) {
        debugLog(
          "Webhook validation error: request aborted during security checks",
          err,
          "warn",
        );
        return new NextResponse(null, { status: 200 });
      }

      // Otherwise rethrow to be handled by outer catch
      throw err;
    }

    if (securityResponse) return securityResponse;

    processingStage = "dbConnect";

    if (checkAbort()) {
      debugLog(
        "Request aborted before DB connect",
        { stage: processingStage },
        "warn",
      );
      return new NextResponse(null, { status: 200 });
    }

    await dbConnect();
    debugLog("Database connection established");

    // Parse form data
    processingStage = "parseFormData";
    if (checkAbort()) {
      debugLog(
        "Request aborted before parsing form data",
        { stage: processingStage },
        "warn",
      );
      return new NextResponse(null, { status: 200 });
    }

    const formData = await req.formData();
    const formDataObj = Object.fromEntries(formData.entries());
    debugLog("Form data parsed", formDataObj);

    // Extract common parameters
    const callSid = formData.get("CallSid") as string;
    const callStatus =
      (formData.get("CallStatus") as string) ||
      (formData.get("DialCallStatus") as string) ||
      "";
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;

    // Extract query parameters
    processingStage = "extractParams";
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");
    const buyerId = searchParams.get("buyerId");
    const singleMultipleIndexParam = searchParams.get("singleMultipleIndex");
    const singleMultipleIndex =
      singleMultipleIndexParam !== null
        ? Number.parseInt(singleMultipleIndexParam, 10)
        : undefined;
    const triedLeadBuyerIds = (
      searchParams.get("triedLeadBuyerIds") || ""
    )
      .split(",")
      .filter(Boolean);

    debugLog("Extracted parameters", {
      callSid,
      callStatus,
      from,
      to,
      sellerId,
      buyerId,
    });

    // Validate required parameters
    processingStage = "validateParams";
    if (!callSid || !sellerId) {
      const errorMessage = "Missing required parameters (callSid or sellerId)";
      debugLog(errorMessage, null, "error");
      return new NextResponse(JSON.stringify({ error: errorMessage }), {
        status: 400,
      });
    }

    // Find the seller
    // Most app paths use the authenticated user's Mongo _id as sellerId.
    // Keep a legacy fallback for any older records that may still store a sellerId field.
    processingStage = "findSeller";
    const seller =
      (await User.findById(sellerId)) ?? (await User.findOne({ sellerId }));
    if (!seller) {
      const errorMessage = `Seller not found for sellerId: ${sellerId}`;
      debugLog(errorMessage, null, "error");
      const twiml = buildBusyFallbackTwiml(callSid);
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Get call charge rate from seller settings
    const callRate = seller.callChargeOptions[0] || { units: 1, seconds: 60 }; // Default rate if not set

    // Handle different call scenarios
    processingStage = "decideCallScenario";
    const rejectedOrUnavailableStatuses = new Set([
      "no-answer",
      "busy",
      "failed",
      "canceled",
    ]);

    if (rejectedOrUnavailableStatuses.has(callStatus)) {
      return handleNoAnswer(
        formData,
        seller,
        callSid,
        from,
        to,
        buyerId || undefined,
        singleMultipleIndex,
        callRate,
        triedLeadBuyerIds,
      );
    } else if (callStatus && callStatus !== "ringing") {
      return handleCallAnswered(formData, callSid, callRate);
    } else {
      return handleNewCall(
        formData,
        seller,
        callSid,
        from,
        to,
        sellerId,
        callRate,
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Call handling failed";
    const errorStack = error instanceof Error ? error.stack : null;

    debugLog(
      "Call handling failed",
      {
        error: errorMessage,
        stack: errorStack,
        duration: `${duration}ms`,
        stage: processingStage,
        name: error instanceof Error ? (error as Error).name : undefined,
        code:
          error instanceof Error
            ? (error as Error & { code?: string }).code
            : undefined,
      },
      "error",
    );

    const twiml = buildBusyFallbackTwiml("");
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

async function handleNewCall(
  formData: FormData,
  seller: InstanceType<typeof User>,
  callSid: string,
  from: string,
  to: string,
  sellerId: string,
  callRate: { units: number; seconds: number },
) {
  debugLog("Handling new call");

  const trackingNumbers = ((
    seller as unknown as { trackingNumbers?: TrackingNumberConfig[] }
  ).trackingNumbers ?? []) as TrackingNumberConfig[];

  // Resolve a routing config. Direct / single_multiple can work without a lead-buyer industry mapping,
  // so prefer an exact phone-number match, then fall back to a manual forwarding config.
  const exactTrackingNumber = trackingNumbers.find(
    (num) => num.phoneNumber === to,
  );
  const manualForwardingFallback = trackingNumbers.find(
    (num) =>
      num.forwardingType === "direct" ||
      num.forwardingType === "single_multiple",
  );
  const trackingNumber = exactTrackingNumber ?? manualForwardingFallback;

  if (!trackingNumber) {
    const errorMessage = `Routing configuration not found for to: ${to}`;
    debugLog(
      errorMessage,
      {
        to,
        availableNumbers: trackingNumbers.map((n) => n.phoneNumber),
        trackingNumberCount: trackingNumbers.length,
      },
      "warn",
    );

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      "We are unable to route this call because no forwarding configuration has been set up yet.",
    );
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  debugLog("Using routing configuration", {
    to,
    matchedBy: exactTrackingNumber ? "phoneNumber" : "manualForwardingFallback",
    forwardingType: trackingNumber.forwardingType,
    industry: trackingNumber.industry,
  });

  const {
    industry,
    forwardingType,
    forwardingNumbers,
    leadBuyers,
    recordCall,

    welcomeMessage,
    passCallerId,
    callWhisper,
    requireResponse,
    buyerResponses,
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
    leadSource,
  } = trackingNumber;

  // ─── DNC List Check ───
  if (dncEnabled && isOnDncList(from, dncList)) {
    debugLog("Caller is on DNC list — rejecting", { from });
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("This number is not able to receive your call. Goodbye.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  // ─── Spam Detection ───
  const stirVerstat = formData.get("StirVerstat") as string;
  const geoData = extractGeoData(from);
  const spamCheck = spamFilterEnabled
    ? checkSpamStatus(stirVerstat, from)
    : { isSpam: false, stirVerstat: stirVerstat || "", spamScore: 0 };

  if (spamFilterEnabled && spamCheck.isSpam && spamFilterAction === "block") {
    debugLog("Spam call blocked", {
      from,
      spamScore: spamCheck.spamScore,
      reason: spamCheck.reason,
    });
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("We are unable to take your call at this time. Goodbye.");
    twiml.hangup();
    // Create a record for tracking
    await createCallRecord({
      callSid,
      userId: String(seller._id),
      from,
      to,
      status: "spam_blocked",
      callRecorded: false,
      forwardingType,
      forwardingNumbers,
      trackingNumber: to,
      leadBuyers: leadBuyers?.map((b: { id: string }) => b.id),
      industry,
      insufficientBalance: false,
      leadSource,
    });
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  // ─── Working Hours Check ───
  // The configured working-hours window is interpreted in the timezone(s) of
  // the buyers registered under this seller for the industry (the buyers the
  // call would be forwarded to) — buyers own their timezone, not the seller.
  // The call is treated as within hours if it falls inside the window for at
  // least one of those buyers' timezones.
  if (enableWorkingHours && workingHoursStart && workingHoursEnd) {
    const sellerBuyerIds = (
      seller as unknown as { buyers?: Array<{ toString(): string }> }
    ).buyers;
    let workingHoursBuyers: Array<{ timezone?: string }> = await Buyer.find({
      _id: { $in: sellerBuyerIds ?? [] },
      "leadPreferences.industries": industry,
    }).select("timezone");
    if (workingHoursBuyers.length === 0) {
      workingHoursBuyers = await Buyer.find({
        registeredWith: seller._id,
        "leadPreferences.industries": industry,
      }).select("timezone");
    }

    const buyerTimezones = Array.from(
      new Set(
        workingHoursBuyers
          .map((b) => (b as unknown as { timezone?: string }).timezone)
          .filter((tz): tz is string => !!tz),
      ),
    );
    // Default to a single timezone when no buyer timezone is available.
    const timezonesToCheck =
      buyerTimezones.length > 0 ? buyerTimezones : ["America/New_York"];

    const withinWorkingHours = timezonesToCheck.some((tz) =>
      isBuyerInBusinessHours({
        acceptOnlyDuringBusinessHours: true,
        workingHours: { start: workingHoursStart, end: workingHoursEnd },
        timezone: tz,
      }),
    );

    if (!withinWorkingHours) {
      debugLog("Call outside working hours (buyer timezones)", {
        workingHoursStart,
        workingHoursEnd,
        timezones: timezonesToCheck,
      });
      const afterHoursTwiml = new twilio.twiml.VoiceResponse();
      // Try overflow number first, then voicemail
      if (overflowNumber) {
        addOverflowToTwiml(afterHoursTwiml, {
          overflowNumber,
          sellerId,
          callSid,
          from,
          passCallerId,
          recordCall,
        });
      } else {
        afterHoursTwiml.say(
          "We are currently outside of business hours. Please leave a message after the beep.",
        );
        addVoicemailToTwiml(afterHoursTwiml, { sellerId, callSid });
      }
      // Send missed-call text-back if configured
      if (missedCallTextBack) {
        const msg =
          missedCallTextMessage ||
          "Sorry we missed your call! We are currently outside business hours and will get back to you shortly.";
        sendMissedCallTextBack(from, msg, callSid);
      }
      // Record the call
      await createCallRecord({
        callSid,
        userId: String(seller._id),
        from,
        to,
        status: "after_hours",
        callRecorded: false,
        forwardingType,
        trackingNumber: to,
        forwardingNumbers,
        leadBuyers: leadBuyers?.map((b: { id: string }) => b.id),
        industry,
        insufficientBalance: false,
        leadSource,
      });
      return new NextResponse(afterHoursTwiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }
  }

  debugLog("Tracking number configuration", {
    industry,
    forwardingType,
    forwardingNumbers,
    leadBuyers: leadBuyers?.length,
    recordCall,
    welcomeMessage: !!welcomeMessage,
    passCallerId,
    callWhisper: !!callWhisper,
    requireResponse,
    spamScore: spamCheck.spamScore,
    geoData,
  });

  // Build whisper/screening URL if configured
  const whisperUrl = getWhisperUrl({
    callWhisper,
    requireResponse,
    buyerResponses,
    sellerId,
    callSid,
    trackingNumber: to,
  });

  // Add spam warning to whisper if configured
  const effectiveWhisperUrl =
    spamFilterEnabled &&
    spamCheck.spamScore >= 60 &&
    spamFilterAction === "warn"
      ? getWhisperUrl({
          callWhisper:
            `⚠ Possible spam call (score: ${spamCheck.spamScore}). ${callWhisper || ""}`.trim(),
          requireResponse,
          buyerResponses,
          sellerId,
          callSid,
          trackingNumber: to,
        })
      : whisperUrl;

  // Initialize TwiML response
  const twiml = new twilio.twiml.VoiceResponse();
  let forwardedTo = "";
  let newBuyerId = "";
  let insufficientBalance = false;
  // Every buyer leg dialed for this call (used to clear concurrent-call
  // tracking for all multi-ring legs when the call completes or goes no-answer).
  const dialedBuyerIds: string[] = [];

  // Play recording consent announcement if enabled
  if (recordingConsent && recordCall) {
    const consent =
      recordingConsentMessage ||
      "This call may be recorded for quality and training purposes.";
    twiml.say(consent);
    debugLog("Recording consent played", { consent });
  }

  // Play welcome message if set
  if (welcomeMessage) {
    twiml.say(welcomeMessage);
    debugLog("Welcome message added to TwiML", { welcomeMessage });
  }

  // ─── Helper: check eligibility for a buyer (vacation, hours, balance, geo, concurrent) ───
  async function isBuyerEligible(
    buyerDoc: unknown,
    buyerId: string,
  ): Promise<boolean> {
    if (buyerDoc && isBuyerOnVacation(buyerDoc)) {
      debugLog("Skipping buyer on vacation", { buyerId });
      return false;
    }
    if (buyerDoc && !isBuyerInBusinessHours(buyerDoc)) {
      debugLog("Skipping buyer outside business hours", { buyerId });
      return false;
    }
    // Geo-routing check
    if (
      geoRoutingEnabled &&
      buyerDoc &&
      !doesBuyerServiceArea(buyerDoc, geoData)
    ) {
      debugLog("Skipping buyer — geo mismatch", {
        buyerId,
        callerArea: geoData,
      });
      return false;
    }
    // Concurrent call limit check
    if (
      concurrentCallLimit &&
      concurrentCallLimit > 0 &&
      (await isBuyerAtConcurrentLimit(buyerId, concurrentCallLimit))
    ) {
      debugLog("Skipping buyer — at concurrent limit", {
        buyerId,
        limit: concurrentCallLimit,
      });
      return false;
    }
    try {
      const { hasSufficientBalance } = await checkBuyerUnitBalance(
        buyerId,
        callRate.units,
      );
      return hasSufficientBalance;
    } catch (error) {
      debugLog("Error checking buyer balance", { buyerId, error }, "warn");
      return false;
    }
  }

  // ─── Helper: handle no-buyer fallback (overflow → callback IVR → voicemail + text-back) ───
  function handleNoBuyersFallback() {
    insufficientBalance = true;
    if (overflowNumber) {
      addOverflowToTwiml(twiml, {
        overflowNumber,
        sellerId,
        callSid,
        from,
        passCallerId,
        recordCall,
      });
      debugLog("No buyers — overflow to external", { overflowNumber }, "warn");
    } else if (scheduledCallbackEnabled) {
      // Offer callback option before voicemail
      const cbDigit = scheduledCallbackDigit || "1";
      const gather = twiml.gather({
        numDigits: 1,
        action: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/callback-request?sellerId=${sellerId}&callSid=${callSid}&from=${encodeURIComponent(from)}&trackingNumber=${encodeURIComponent(to)}&industry=${encodeURIComponent(industry)}&expectedDigit=${encodeURIComponent(cbDigit)}`,
        method: "POST",
        timeout: 5,
      });
      gather.say(
        `No one is available right now. Press ${cbDigit} to request a callback, or stay on the line to leave a message.`,
      );
      // If no input, fall through to voicemail
      addVoicemailToTwiml(twiml, { sellerId, callSid });
    } else {
      addVoicemailToTwiml(twiml, { sellerId, callSid });
    }

    // Send missed-call text-back (non-blocking)
    if (missedCallTextBack) {
      const msg =
        missedCallTextMessage ||
        "Sorry we missed your call! A representative will call you back shortly.";
      sendMissedCallTextBack(from, msg, callSid);
    }
  }

  const dialNumbersSimultaneously = (
    phoneTargets: string[],
    options: { buyerIds?: string[]; buyerIdForAction?: string },
    whisperUrl?: string,
  ) => {
    const dialParams = getDialParams({
      from,
      sellerId,
      callSid,
      buyerId: options.buyerIdForAction,
      passCallerId,
      trackingNumber: to,
      recordCall,
    });
    const dial = twiml.dial(dialParams);
    if (whisperUrl) {
      debugLog("Call whisper attached to multi-ring dial leg", {
        callSid,
        buyerId: options.buyerIdForAction,
        whisperUrl,
        targetCount: phoneTargets.length,
      });
    }
    phoneTargets.forEach((phone) => {
      const numAttrs: Record<string, string> = {};
      if (whisperUrl) {
        numAttrs.url = whisperUrl;
        numAttrs.method = "POST";
      }
      dial.number(numAttrs, phone);
    });

    if (options.buyerIds?.length) {
      options.buyerIds.forEach((id) => {
        markCallActive(id, callSid);
        dialedBuyerIds.push(id);
      });
    }
  };

  // Handle different forwarding types
  if (forwardingType === "direct") {
    try {
      if (multiRingEnabled) {
        const sellerBuyerIds = (
          seller as unknown as { buyers?: Array<{ toString(): string }> }
        ).buyers;
        let candidateBuyers = await Buyer.find({
          _id: { $in: sellerBuyerIds ?? [] },
          "leadPreferences.industries": industry,
        }).sort({ _id: 1 });

        if (candidateBuyers.length === 0) {
          candidateBuyers = await Buyer.find({
            registeredWith: seller._id,
            "leadPreferences.industries": industry,
          }).sort({ _id: 1 });
        }

        const eligibleBuyers = [];
        for (const buyerDoc of candidateBuyers) {
          const buyerId = buyerDoc._id.toString();
          if (!(await isBuyerEligible(buyerDoc, buyerId))) {
            continue;
          }
          if (!buyerDoc.phone) {
            continue;
          }
          eligibleBuyers.push({ id: buyerId, phone: buyerDoc.phone });
        }

        if (eligibleBuyers.length > 0) {
          const phones = eligibleBuyers.map((b) => b.phone);
          const buyerIds = eligibleBuyers.map((b) => b.id);

          dialNumbersSimultaneously(
            phones,
            {
              buyerIds,
              buyerIdForAction: buyerIds[0],
            },
            withMultiRingScreening(effectiveWhisperUrl, phones.length),
          );

          forwardedTo = phones.join(", ");
          newBuyerId = buyerIds[0];

          debugLog("Direct multi-ring initiated", {
            buyerCount: eligibleBuyers.length,
            numbers: forwardedTo,
            industry,
          });
        } else {
          handleNoBuyersFallback();
          debugLog(
            "No buyers available for direct multi-ring",
            { industry },
            "warn",
          );
        }
      } else {
        // Atomic round-robin, now filtering geo-routing/concurrent-limit
        // eligibility *during* rotation (via extraEligibilityCheck) instead
        // of only validating the single ticket-selected buyer afterward —
        // previously a geo/concurrent-limit failure on that one buyer sent
        // the whole call to fallback even when other buyers in the same
        // industry were eligible right now.
        const { buyer } = await getNextRoundRobinBuyerAtomic(
          seller,
          industry,
          callRate,
          (candidate) => isBuyerEligible(candidate, candidate._id.toString()),
        );

        forwardedTo = buyer.phone;
        newBuyerId = buyer._id.toString();

        // Mark call as active for concurrent tracking
        markCallActive(newBuyerId, callSid);
        dialedBuyerIds.push(newBuyerId);

        const dialParams = getDialParams({
          from,
          sellerId,
          callSid,
          buyerId: newBuyerId,
          passCallerId,
          trackingNumber: to,
          recordCall,
        });
        dialWithWhisper(twiml, forwardedTo, dialParams, effectiveWhisperUrl);
      }
    } catch (error) {
      handleNoBuyersFallback();
      debugLog(
        "No buyers available for direct forwarding",
        { error: error instanceof Error ? error.message : "Unknown error" },
        "warn",
      );
    }
  } else if (
    forwardingType === "single_multiple" &&
    forwardingNumbers?.length
  ) {
    if (multiRingEnabled && forwardingNumbers.length > 1) {
      dialNumbersSimultaneously(
        forwardingNumbers,
        {},
        withMultiRingScreening(effectiveWhisperUrl, forwardingNumbers.length),
      );
      debugLog("Single/multiple multi-ring initiated", {
        numberCount: forwardingNumbers.length,
        numbers: forwardingNumbers,
      });
    } else {
      forwardingNumbers.forEach((num: string, index: number) => {
        const dialParams = getDialParams({
          from,
          sellerId,
          callSid,
          passCallerId,
          trackingNumber: to,
          recordCall,
        });
        dialParams.action = appendSingleMultipleIndex(dialParams.action, index);
        dialWithWhisper(twiml, num, dialParams, effectiveWhisperUrl);
        if (index < forwardingNumbers.length - 1) {
          twiml.pause({ length: 1 });
        }
      });
    }
    forwardedTo = forwardingNumbers.join(", ");
  } else if (forwardingType === "specific_lead" && leadBuyers?.length) {
    // Look up full buyer documents to check availability
    const buyerIds = leadBuyers.map((b: { id: string }) => b.id);
    const buyerDocs = await Buyer.find({ _id: { $in: buyerIds } });
    const buyerDocMap = new Map(buyerDocs.map((b) => [b._id.toString(), b]));

    // Filter lead buyers with all eligibility checks
    const eligibleBuyers = [];
    for (const buyer of leadBuyers) {
      const buyerDoc = buyerDocMap.get(buyer.id.toString());
      if (await isBuyerEligible(buyerDoc, buyer.id.toString())) {
        eligibleBuyers.push(buyer);
      }
    }

    // Always dial the buyer's live/current phone (buyerDoc.phone), not the
    // phone snapshotted on the tracking number's leadBuyers list at
    // configuration time — that snapshot goes stale the moment a buyer
    // updates their number in their own profile.
    const livePhone = (buyer: { id: string; phone: string }) =>
      buyerDocMap.get(buyer.id.toString())?.phone || buyer.phone;

    if (eligibleBuyers.length === 0) {
      handleNoBuyersFallback();
      debugLog("No eligible buyers — filtered by all criteria", null, "warn");
    } else if (multiRingEnabled && eligibleBuyers.length > 1) {
      // Use the shared multi-ring helper so screening/whisper behavior matches single_multiple.
      dialNumbersSimultaneously(
        eligibleBuyers.map(livePhone),
        {
          buyerIds: eligibleBuyers.map((buyer) => buyer.id.toString()),
          buyerIdForAction: eligibleBuyers[0].id.toString(),
        },
        withMultiRingScreening(effectiveWhisperUrl, eligibleBuyers.length),
      );
      forwardedTo = eligibleBuyers.map(livePhone).join(", ");
      newBuyerId = eligibleBuyers[0]?.id;
      debugLog("Multi-ring initiated", {
        buyerCount: eligibleBuyers.length,
        numbers: forwardedTo,
      });
    } else {
      // Sequential dial — only the FIRST eligible buyer can ever actually
      // ring in this TwiML response: a <Dial> with an `action` (which every
      // dial here has, via getDialParams) hijacks control to that action's
      // response once it completes, so sibling <Dial> verbs after it never
      // execute. Advancing to the next eligible buyer therefore has to
      // happen through the no-answer retry chain (see triedLeadBuyerIds in
      // handleNoAnswer) rather than by emitting more sibling verbs here.
      const firstBuyer = eligibleBuyers[0];
      const firstBuyerPhone = livePhone(firstBuyer);
      const dialParams = getDialParams({
        from,
        sellerId,
        callSid,
        buyerId: firstBuyer.id.toString(),
        passCallerId,
        trackingNumber: to,
        recordCall,
      });
      dialParams.action = appendTriedLeadBuyerIds(dialParams.action, [
        firstBuyer.id.toString(),
      ]);
      dialWithWhisper(twiml, firstBuyerPhone, dialParams, effectiveWhisperUrl);
      markCallActive(firstBuyer.id.toString(), callSid);
      dialedBuyerIds.push(firstBuyer.id.toString());
      forwardedTo = firstBuyerPhone;
      newBuyerId = firstBuyer.id;
    }
  } else {
    twiml.say("No forwarding rules configured. Ending call.");
    debugLog("No forwarding rules configured. Call ended.", null, "warn");
  }

  // Create call record with all new fields
  const recordLeadBuyers = Array.from(
    new Set([
      ...(leadBuyers?.map((b: { id: string }) => b.id) ?? []),
      ...dialedBuyerIds,
    ]),
  );
  const newCall = await createCallRecord({
    callSid,
    userId: String(seller._id),
    buyerId: newBuyerId,
    from,
    to: forwardedTo || to,
    status: insufficientBalance ? "insufficient_balance" : "forwarded",
    callRecorded: recordCall,
    forwardingType,
    forwardingNumbers,
    leadBuyers: recordLeadBuyers,
    industry,
    insufficientBalance,
    trackingNumber: to,
    leadSource,
  });

  // Update call with geo/spam data (non-blocking)
  Call.updateOne(
    { callSid },
    {
      $set: {
        callerAreaCode: geoData.areaCode,
        callerCity: geoData.city || "",
        callerState: geoData.state || "",
        stirVerstat: spamCheck.stirVerstat,
        spamScore: spamCheck.spamScore,
        flaggedAsSpam: spamCheck.isSpam,
      },
    },
  ).catch(() => {});

  debugLog("New call record created", { callId: newCall._id });

  // Fire call webhook (non-blocking)
  dispatchCallWebhook(String(seller._id), "callForwarded", {
    callSid,
    from,
    to: forwardedTo || to,
    status: insufficientBalance ? "insufficient_balance" : "forwarded",
    industry,
    buyerId: newBuyerId,
    forwardingType,
  });

  // Send notifications
  await sendNotifications(
    seller,
    `A call from ${from} has been ${
      insufficientBalance
        ? "not forwarded due to insufficient buyer balance"
        : `forwarded to ${forwardedTo || to}`
    }.`,
  );

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function handleNoAnswer(
  formData: FormData,
  seller: InstanceType<typeof User>,
  callSid: string,
  from: string,
  to: string,
  buyerId?: string,
  singleMultipleIndex?: number,
  callRate?: { units: number; seconds: number },
  triedLeadBuyerIds: string[] = [],
) {
  try {
    debugLog("Handling no-answer scenario", { callSid, buyerId });

    // Mark buyer call inactive for concurrent tracking. The action callback
    // only carries the primary buyerId, so also clear every dialed leg below
    // once we've loaded the call record (covers multi-ring siblings).
    if (buyerId) {
      markCallInactive(buyerId, callSid);
    }

    // Find the original call record
    const originalCall = await Call.findOne({ callSid });
    if (!originalCall) {
      const errorMessage = `Call record not found for CallSid: ${callSid}`;
      debugLog(errorMessage, null, "error");
      const twiml = buildBusyFallbackTwiml(callSid);
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Clear concurrent-call tracking for all dialed legs of this call.
    markAllLegsInactive(originalCall, callSid);

    // Update original call status and bump the retry-attempt counter. Twilio
    // reports the same parent CallSid on every no-answer for this phone call
    // no matter how many <Dial> hops have happened, so this one record (and
    // its counter) is authoritative across the whole retry chain regardless
    // of forwarding type.
    originalCall.status = "no-answer";
    const currentRetryAttempt = (originalCall.retryAttempt || 0) + 1;
    originalCall.retryAttempt = currentRetryAttempt;
    await originalCall.save();

    const {
      forwardingType,
      forwardingNumbers,
      leadBuyers,
      industry,
      callRecorded,
      passCallerId,
      leadSource,
    } = originalCall;

    const twiml = new twilio.twiml.VoiceResponse();

    // Look up tracking number config for overflow + feature flags
    const trackingNumbers = ((
      seller as unknown as { trackingNumbers?: TrackingNumberConfig[] }
    ).trackingNumbers ?? []) as TrackingNumberConfig[];
    const trackingConfig = trackingNumbers.find(
      (num: { phoneNumber: string }) => num.phoneNumber === to,
    );
    const overflowNumber = trackingConfig?.overflowNumber || "";
    const reconnectEnabled = trackingConfig?.reconnectCaller || false;
    const missedCallTextBack = trackingConfig?.missedCallTextBack || false;
    const missedCallTextMessage = trackingConfig?.missedCallTextMessage || "";
    const scheduledCallbackEnabled =
      trackingConfig?.scheduledCallbackEnabled || false;
    const scheduledCallbackDigit =
      trackingConfig?.scheduledCallbackDigit || "1";
    const multiRingEnabled = trackingConfig?.multiRingEnabled || false;
    const geoRoutingEnabled = trackingConfig?.geoRoutingEnabled || false;
    const concurrentCallLimit = trackingConfig?.concurrentCallLimit || 0;
    const retryWhisperUrl = getWhisperUrl({
      callWhisper: trackingConfig?.callWhisper,
      requireResponse: trackingConfig?.requireResponse,
      buyerResponses: trackingConfig?.buyerResponses,
      sellerId: String(seller._id),
      callSid,
      trackingNumber: to,
    });

    // Extract geo data for geo-routing in retry
    const geoData = geoRoutingEnabled ? extractGeoData(from) : null;

    // Helper: no-answer fallback (overflow → callback IVR → voicemail + text-back)
    const handleNoAnswerFallback = () => {
      if (overflowNumber) {
        addOverflowToTwiml(twiml, {
          overflowNumber,
          sellerId: seller._id as string,
          callSid,
          from,
          passCallerId,
          recordCall: callRecorded,
        });
        debugLog("No-answer fallback: overflow", { overflowNumber });
      } else if (scheduledCallbackEnabled) {
        const baseUrl = env.NEXTAUTH_URL || "";
        twiml.say("All of our representatives are currently unavailable.");
        const gather = twiml.gather({
          numDigits: 1,
          timeout: 5,
          action: `${baseUrl}/api/calls/twilio/callback-request?callSid=${callSid}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&sellerId=${seller._id}&industry=${industry || ""}&expectedDigit=${encodeURIComponent(scheduledCallbackDigit)}`,
          method: "POST",
        });
        gather.say(`Press ${scheduledCallbackDigit} to request a callback.`);
        addVoicemailToTwiml(twiml, {
          sellerId: seller._id as string,
          callSid,
        });
        debugLog("No-answer fallback: callback IVR offered");
      } else {
        addVoicemailToTwiml(twiml, {
          sellerId: seller._id as string,
          callSid,
        });
        debugLog("No-answer fallback: voicemail");
      }
      // Send missed call text-back (non-blocking)
      if (missedCallTextBack && missedCallTextMessage) {
        sendMissedCallTextBack(from, missedCallTextMessage, callSid);
      }
    };

    // Handle different forwarding types for retry.
    //
    // Auto-Reconnect only gates whether "direct" round-robin tries an
    // additional *buyer* beyond the one first picked — it does not gate
    // whether single_multiple/specific_lead advance through the list of
    // targets the seller explicitly configured. Treating "try the next
    // configured number/buyer" as an optional extra (rather than the whole
    // point of listing more than one) meant sellers who left this toggle at
    // its default (off) only ever had their first configured number/buyer
    // attempted, with the rest silently unused.
    if (currentRetryAttempt > CALL_DEFAULTS.maxRetryAttempts) {
      debugLog("Max retry attempts reached — falling back", {
        callSid,
        currentRetryAttempt,
        maxRetryAttempts: CALL_DEFAULTS.maxRetryAttempts,
      });
      handleNoAnswerFallback();
    } else if (!reconnectEnabled && forwardingType === "direct") {
      debugLog("Auto-Reconnect disabled — going straight to fallback", {
        callSid,
      });
      handleNoAnswerFallback();
    } else if (forwardingType === "direct") {
      try {
        if (multiRingEnabled) {
          const sellerBuyerIds = (
            seller as unknown as { buyers?: Array<{ toString(): string }> }
          ).buyers;
          const retryCandidates = await Buyer.find({
            _id: { $in: sellerBuyerIds ?? [] },
            "leadPreferences.industries": industry,
          }).sort({ _id: 1 });

          const eligibleRetryBuyers = [];
          for (const buyerDoc of retryCandidates) {
            const buyerIdStr = buyerDoc._id.toString();

            if (isBuyerOnVacation(buyerDoc)) {
              continue;
            }
            if (!isBuyerInBusinessHours(buyerDoc)) {
              continue;
            }
            if (
              geoRoutingEnabled &&
              geoData &&
              !doesBuyerServiceArea(buyerDoc, geoData)
            ) {
              continue;
            }
            if (
              concurrentCallLimit > 0 &&
              (await isBuyerAtConcurrentLimit(buyerIdStr, concurrentCallLimit))
            ) {
              continue;
            }

            const { hasSufficientBalance } = await checkBuyerUnitBalance(
              buyerIdStr,
              callRate?.units || 1,
            );
            if (!hasSufficientBalance || !buyerDoc.phone) {
              continue;
            }

            eligibleRetryBuyers.push({ id: buyerIdStr, phone: buyerDoc.phone });
          }

          if (eligibleRetryBuyers.length === 0) {
            handleNoAnswerFallback();
          } else {
            const retryActionCallSid = `${callSid}-retry-${Date.now()}`;
            const dialParams = getDialParams({
              from,
              sellerId: seller._id as string,
              callSid: retryActionCallSid,
              buyerId: eligibleRetryBuyers[0].id,
              passCallerId,
              trackingNumber: to,
              recordCall: callRecorded,
            });
            const dial = twiml.dial(dialParams);

            const retryMultiRingWhisper = withMultiRingScreening(
              retryWhisperUrl,
              eligibleRetryBuyers.length,
            );
            eligibleRetryBuyers.forEach((buyer) => {
              const numberAttrs: Record<string, string> = {};
              if (retryMultiRingWhisper) {
                numberAttrs.url = retryMultiRingWhisper;
                numberAttrs.method = "POST";
              }
              dial.number(numberAttrs, buyer.phone);
              markCallActive(buyer.id, retryActionCallSid);
            });

            await createCallRecord({
              callSid: retryActionCallSid,
              userId: String(seller._id),
              buyerId: eligibleRetryBuyers[0].id,
              from,
              to: eligibleRetryBuyers.map((b) => b.phone).join(", "),
              status: "forwarded",
              callRecorded,
              forwardingType,
              forwardingNumbers,
              // Store all dialed legs so concurrent-call tracking can be cleared
              // for every ringing buyer when this retry leg completes/no-answers.
              leadBuyers: eligibleRetryBuyers.map((b) => b.id),
              industry,
              trackingNumber: to,
              retryAttempt: currentRetryAttempt,
              leadSource,
            });
          }
        } else {
          // Atomic round-robin for retry too, with the same geo/concurrent
          // eligibility filtering applied during rotation as the initial
          // call (previously this retry path skipped those checks entirely
          // and could dial a geo-mismatched or over-limit buyer).
          const { buyer } = await getNextRoundRobinBuyerAtomic(
            seller,
            industry,
            callRate || { units: 1, seconds: 60 },
            async (candidate) => {
              if (
                geoRoutingEnabled &&
                geoData &&
                !doesBuyerServiceArea(candidate, geoData)
              ) {
                return false;
              }
              if (
                concurrentCallLimit > 0 &&
                (await isBuyerAtConcurrentLimit(
                  candidate._id.toString(),
                  concurrentCallLimit,
                ))
              ) {
                return false;
              }
              return true;
            },
          );
          const newCallSid = `${callSid}-retry-${Date.now()}`;

          const dialParams = getDialParams({
            from,
            sellerId: seller._id as string,
            callSid: newCallSid,
            buyerId: buyer._id.toString(),
            passCallerId,
            trackingNumber: to,
            recordCall: callRecorded,
          });
          dialWithWhisper(twiml, buyer.phone, dialParams, retryWhisperUrl);

          // Create new call record for retry
          await createCallRecord({
            callSid: newCallSid,
            userId: String(seller._id),
            buyerId: buyer._id.toString(),
            from,
            to: buyer.phone,
            status: "forwarded",
            callRecorded,
            forwardingType,
            forwardingNumbers,
            leadBuyers: leadBuyers?.map((b: { id: string }) => b.id),
            industry,
            trackingNumber: to,
            retryAttempt: currentRetryAttempt,
            leadSource,
          });
        }
      } catch (e) {
        debugLog(
          "Error during direct retry in handleNoAnswer",
          {
            callSid,
            error: e instanceof Error ? e.message : e,
            stack: e instanceof Error ? e.stack : undefined,
          },
          "warn",
        );
        handleNoAnswerFallback();
      }
    } else if (
      forwardingType === "single_multiple" &&
      forwardingNumbers?.length
    ) {
      const currentForwardingIndex =
        typeof singleMultipleIndex === "number" &&
        Number.isInteger(singleMultipleIndex) &&
        singleMultipleIndex >= 0
          ? singleMultipleIndex
          : undefined;
      const nextForwardingIndex =
        typeof currentForwardingIndex === "number"
          ? currentForwardingIndex + 1
          : 0;
      const remainingForwardingNumbers =
        forwardingNumbers.slice(nextForwardingIndex);

      if (remainingForwardingNumbers.length === 0) {
        handleNoAnswerFallback();
        return new NextResponse(twiml.toString(), {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      if (multiRingEnabled && forwardingNumbers.length > 1) {
        const retryActionCallSid = `${callSid}-retry-${Date.now()}`;
        const dialParams = getDialParams({
          from,
          sellerId: seller._id as string,
          callSid: retryActionCallSid,
          passCallerId,
          trackingNumber: to,
          recordCall: callRecorded,
        });
        const dial = twiml.dial(dialParams);
        const retryMultiRingWhisper = withMultiRingScreening(
          retryWhisperUrl,
          remainingForwardingNumbers.length,
        );
        remainingForwardingNumbers.forEach((num: string) => {
          const numberAttrs: Record<string, string> = {};
          if (retryMultiRingWhisper) {
            numberAttrs.url = retryMultiRingWhisper;
            numberAttrs.method = "POST";
          }
          dial.number(numberAttrs, num);
        });
      } else {
        remainingForwardingNumbers.forEach((num: string, index: number) => {
          const forwardingIndex = nextForwardingIndex + index;
          const dialParams = getDialParams({
            from,
            sellerId: seller._id as string,
            callSid: `${callSid}-retry-${forwardingIndex}`,
            passCallerId,
            trackingNumber: to,
            recordCall: callRecorded,
          });
          dialParams.action = appendSingleMultipleIndex(
            dialParams.action,
            forwardingIndex,
          );
          dialWithWhisper(twiml, num, dialParams, retryWhisperUrl);
          if (index < remainingForwardingNumbers.length - 1) {
            twiml.pause({ length: 1 });
          }
        });
      }
    } else if (forwardingType === "specific_lead" && leadBuyers?.length) {
      // Look up full buyer documents for availability checks
      const retryBuyerIds = leadBuyers.map((b: { id: string }) => b.id);
      const retryBuyerDocs = await Buyer.find({ _id: { $in: retryBuyerIds } });
      const retryBuyerDocMap = new Map(
        retryBuyerDocs.map((b) => [b._id.toString(), b]),
      );

      // Filter lead buyers by availability, business hours, geo, concurrent,
      // balance, AND exclude anyone already tried in this call chain —
      // without this exclusion, the sequential branch below would just keep
      // re-selecting the same first-in-list buyer forever, since nothing
      // else about their eligibility changes between a no-answer and the
      // retry that follows it.
      const triedSet = new Set(triedLeadBuyerIds);
      const eligibleBuyers = [];
      for (const buyer of leadBuyers) {
        if (triedSet.has(buyer.id.toString())) {
          continue;
        }
        const buyerDoc = retryBuyerDocMap.get(buyer.id.toString());

        if (buyerDoc && isBuyerOnVacation(buyerDoc)) {
          debugLog("Skipping retry buyer on vacation", { buyerId: buyer.id });
          continue;
        }
        if (buyerDoc && !isBuyerInBusinessHours(buyerDoc)) {
          debugLog("Skipping retry buyer outside business hours", {
            buyerId: buyer.id,
          });
          continue;
        }
        // Geo-routing check
        if (
          geoRoutingEnabled &&
          geoData &&
          buyerDoc &&
          !doesBuyerServiceArea(buyerDoc, geoData)
        ) {
          debugLog("Skipping retry buyer (geo mismatch)", {
            buyerId: buyer.id,
          });
          continue;
        }
        // Concurrent call limit check
        if (
          concurrentCallLimit > 0 &&
          (await isBuyerAtConcurrentLimit(
            buyer.id.toString(),
            concurrentCallLimit,
          ))
        ) {
          debugLog("Skipping retry buyer (concurrent limit)", {
            buyerId: buyer.id,
          });
          continue;
        }

        try {
          const { hasSufficientBalance } = await checkBuyerUnitBalance(
            buyer.id.toString(),
            callRate?.units || 1,
          );
          if (hasSufficientBalance) {
            eligibleBuyers.push(buyer);
          }
        } catch (error) {
          debugLog(
            "Error checking buyer balance",
            { buyerId: buyer.id, error },
            "warn",
          );
        }
      }

      const retryLivePhone = (buyer: { id: string; phone: string }) =>
        retryBuyerDocMap.get(buyer.id.toString())?.phone || buyer.phone;

      if (eligibleBuyers.length === 0) {
        handleNoAnswerFallback();
      } else if (multiRingEnabled && eligibleBuyers.length > 1) {
        const retryActionCallSid = `${callSid}-retry-${Date.now()}`;
        const dialParams = getDialParams({
          from,
          sellerId: seller._id as string,
          callSid: retryActionCallSid,
          buyerId: eligibleBuyers[0].id.toString(),
          passCallerId,
          trackingNumber: to,
          recordCall: callRecorded,
        });
        const dial = twiml.dial(dialParams);

        const retryMultiRingWhisper = withMultiRingScreening(
          retryWhisperUrl,
          eligibleBuyers.length,
        );
        eligibleBuyers.forEach((buyer: { id: string; phone: string }) => {
          const numberAttrs: Record<string, string> = {};
          if (retryMultiRingWhisper) {
            numberAttrs.url = retryMultiRingWhisper;
            numberAttrs.method = "POST";
          }
          dial.number(numberAttrs, retryLivePhone(buyer));
          markCallActive(buyer.id.toString(), retryActionCallSid);
        });

        // Persist the retry leg so the answered/no-answer webhook can find it
        // and clear concurrent-call tracking for every ringing buyer (the
        // markCallActive calls above would otherwise leak until their TTL).
        await createCallRecord({
          callSid: retryActionCallSid,
          userId: String(seller._id),
          buyerId: eligibleBuyers[0].id.toString(),
          from,
          to: eligibleBuyers.map(retryLivePhone).join(", "),
          status: "forwarded",
          callRecorded,
          forwardingType,
          forwardingNumbers,
          leadBuyers: eligibleBuyers.map((b: { id: string }) =>
            b.id.toString(),
          ),
          industry,
          trackingNumber: to,
          retryAttempt: currentRetryAttempt,
          leadSource,
        });
      } else {
        // Sequential: only the next remaining eligible buyer can ever
        // actually ring (see the comment on appendTriedLeadBuyerIds), so
        // dial just that one and extend the tried-list for the *next*
        // no-answer instead of emitting unreachable sibling verbs.
        const nextBuyer = eligibleBuyers[0];
        const nextBuyerPhone = retryLivePhone(nextBuyer);
        const dialParams = getDialParams({
          from,
          sellerId: seller._id as string,
          callSid,
          buyerId: nextBuyer.id.toString(),
          passCallerId,
          trackingNumber: to,
          recordCall: callRecorded,
        });
        dialParams.action = appendTriedLeadBuyerIds(dialParams.action, [
          ...triedLeadBuyerIds,
          nextBuyer.id.toString(),
        ]);
        dialWithWhisper(twiml, nextBuyerPhone, dialParams, retryWhisperUrl);
        markCallActive(nextBuyer.id.toString(), callSid);
      }
    } else {
      twiml.say("No forwarding rules configured. Ending call.");
      debugLog("No forwarding rules configured. Call ended.", null, "warn");
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    debugLog(
      "Unhandled error in handleNoAnswer",
      {
        callSid,
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
      },
      "error",
    );
    throw err;
  }
}

async function handleCallAnswered(
  formData: FormData,
  callSid: string,
  callRate: { units: number; seconds: number },
) {
  try {
    debugLog("Handling answered call", { callSid });

    const recordingUrl = formData.get("RecordingUrl") as string;
    const callDuration = formData.get("CallDuration") as string;
    const answeredBy = (formData.get("AnsweredBy") as string) || "Unknown";

    const updatedCall = await updateAnsweredCall(
      callSid,
      {
        status: "completed",
        recordingUrl,
        callDuration: callDuration ? parseInt(callDuration, 10) : undefined,
        answeredBy,
      },
      callRate,
    );

    // Fire call completed webhook (non-blocking)
    if (updatedCall) {
      // Mark call inactive for concurrent tracking (all multi-ring legs)
      markAllLegsInactive(updatedCall, callSid);

      dispatchCallWebhook(updatedCall.userId, "callCompleted", {
        callSid,
        from: updatedCall.from,
        to: updatedCall.to,
        status: "completed",
        industry: updatedCall.industry,
        buyerId: updatedCall.buyerId,
        callDuration: updatedCall.callDuration,
        unitsCharged: updatedCall.unitsCharged,
        recordingUrl: updatedCall.recordingUrl,
        paymentStatus: updatedCall.paymentStatus,
      });

      // Trigger AI analysis if configured (non-blocking, fire-and-forget)
      const seller = await User.findById(updatedCall.userId);
      if (seller) {
        const trackingNumbers = ((
          seller as unknown as { trackingNumbers?: TrackingNumberConfig[] }
        ).trackingNumbers ?? []) as TrackingNumberConfig[];
        // Match by the specific tracking number that took this call, not by
        // industry — a seller can have multiple tracking numbers sharing the
        // same industry with different AI/transcription settings, and an
        // industry-only match could apply the wrong number's config.
        const tn = updatedCall.trackingNumber
          ? trackingNumbers.find(
              (n: { phoneNumber?: string }) =>
                n.phoneNumber === updatedCall.trackingNumber,
            )
          : trackingNumbers.find(
              (n: { industry?: string }) => n.industry === updatedCall.industry,
            );
        if (tn?.transcriptionEnabled || tn?.aiSummaryEnabled) {
          processCallAIAnalysis(callSid, {
            transcriptionEnabled: !!tn.transcriptionEnabled,
            aiSummaryEnabled: !!tn.aiSummaryEnabled,
            industry: updatedCall.industry,
          }).catch(() => {});
        }
      }
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        updatedCall,
        unitsCharged: updatedCall?.unitsCharged || 0,
      }),
      {
        status: 200,
      },
    );
  } catch (err) {
    debugLog(
      "Unhandled error in handleCallAnswered",
      {
        callSid,
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
      },
      "error",
    );
    throw err;
  }
}
