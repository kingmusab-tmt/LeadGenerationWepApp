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
import {
  callSecurityMiddleware,
  CALL_DEFAULTS,
} from "@/lib/security/callSecurity";
import { dispatchCallWebhook } from "@/lib/integrations/callWebhookDispatcher";
import {
  checkSpamStatus,
  isOnDncList,
  sendMissedCallTextBack,
  createScheduledCallback,
  extractGeoData,
  doesBuyerServiceArea,
  isBuyerAtConcurrentLimit,
  markCallActive,
  markCallInactive,
} from "@/utils/callFeatureServices";
import { processCallAIAnalysis } from "@/lib/callAIAnalysis";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  debugLog("Incoming call request received");

  try {
    // Security checks: rate limiting + webhook signature validation
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    await dbConnect();
    debugLog("Database connection established");

    // Parse form data
    const formData = await req.formData();
    const formDataObj = Object.fromEntries(formData.entries());
    debugLog("Form data parsed", formDataObj);

    // Extract common parameters
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");
    const buyerId = searchParams.get("buyerId");

    debugLog("Extracted parameters", {
      callSid,
      callStatus,
      from,
      to,
      sellerId,
      buyerId,
    });

    // Validate required parameters
    if (!callSid || !sellerId) {
      const errorMessage = "Missing required parameters (callSid or sellerId)";
      debugLog(errorMessage, null, "error");
      return new NextResponse(JSON.stringify({ error: errorMessage }), {
        status: 400,
      });
    }

    // Find the seller
    const seller = await User.findOne({ sellerId });
    if (!seller) {
      const errorMessage = `Seller not found for sellerId: ${sellerId}`;
      debugLog(errorMessage, null, "error");
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });
    }

    // Get call charge rate from seller settings
    const callRate = seller.callChargeOptions[0] || { units: 1, seconds: 60 }; // Default rate if not set

    // Handle different call scenarios
    if (callStatus === "no-answer") {
      return handleNoAnswer(
        formData,
        seller,
        callSid,
        from,
        to,
        buyerId || undefined,
        callRate,
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
      },
      "error",
    );

    return new NextResponse(
      JSON.stringify({
        error: "Call handling failed",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : null,
      }),
      { status: 500 },
    );
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

  // Find the tracking number configuration
  const trackingNumber = seller.trackingNumbers.find(
    (num) => num.phoneNumber === to,
  );

  if (!trackingNumber) {
    const errorMessage = `Industry mapping not found for to: ${to}`;
    debugLog(
      errorMessage,
      {
        to,
        availableNumbers: seller.trackingNumbers.map((n) => n.phoneNumber),
      },
      "error",
    );
    return new NextResponse(
      JSON.stringify({ error: "Industry mapping not found" }),
      { status: 404 },
    );
  }

  const {
    industry,
    forwardingType,
    forwardingNumbers,
    leadBuyers,
    recordCall,
    reconnectCaller,
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
    transcriptionEnabled,
    aiSummaryEnabled,
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
      leadBuyers: leadBuyers?.map((b: { id: string }) => b.id),
      industry,
      insufficientBalance: false,
    });
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  // ─── Seller Working Hours Check ───
  if (enableWorkingHours && workingHoursStart && workingHoursEnd) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (currentTime < workingHoursStart || currentTime >= workingHoursEnd) {
      debugLog("Call outside seller working hours", {
        currentTime,
        workingHoursStart,
        workingHoursEnd,
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
        forwardingNumbers,
        leadBuyers: leadBuyers?.map((b: { id: string }) => b.id),
        industry,
        insufficientBalance: false,
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
        })
      : whisperUrl;

  // Initialize TwiML response
  const twiml = new twilio.twiml.VoiceResponse();
  let forwardedTo = "";
  let newBuyerId = "";
  let insufficientBalance = false;

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
    buyerDoc: any,
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
        action: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/callback-request?sellerId=${sellerId}&callSid=${callSid}&from=${encodeURIComponent(from)}&trackingNumber=${encodeURIComponent(to)}&industry=${encodeURIComponent(industry)}`,
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

  // Handle different forwarding types
  if (forwardingType === "direct") {
    try {
      // Use atomic round-robin to prevent race conditions (Issue #1 fix)
      const { buyer } = await getNextRoundRobinBuyerAtomic(
        seller,
        industry,
        callRate,
      );

      // Additional eligibility checks (geo, concurrent)
      const buyerDoc = await Buyer.findById(buyer._id);
      if (
        (geoRoutingEnabled ||
          (concurrentCallLimit && concurrentCallLimit > 0)) &&
        buyerDoc &&
        !(await isBuyerEligible(buyerDoc, buyer._id.toString()))
      ) {
        throw new Error("Buyer not eligible after extended checks");
      }

      forwardedTo = buyer.phone;
      newBuyerId = buyer._id.toString();

      // Mark call as active for concurrent tracking
      markCallActive(newBuyerId, callSid);

      const dialParams = getDialParams({
        from,
        sellerId,
        callSid,
        buyerId: newBuyerId,
        passCallerId,
        recordCall,
      });
      dialWithWhisper(twiml, forwardedTo, dialParams, effectiveWhisperUrl);
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
    forwardingNumbers.forEach((num: string, index: number) => {
      const dialParams = getDialParams({
        from,
        sellerId,
        callSid,
        passCallerId,
        recordCall,
      });
      dialWithWhisper(twiml, num, dialParams, effectiveWhisperUrl);
      if (index < forwardingNumbers.length - 1) {
        twiml.pause({ length: 1 });
      }
    });
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

    if (eligibleBuyers.length === 0) {
      handleNoBuyersFallback();
      debugLog("No eligible buyers — filtered by all criteria", null, "warn");
    } else if (multiRingEnabled && eligibleBuyers.length > 1) {
      // ─── Multi-Ring: ring all eligible buyers simultaneously ───
      const dialParams = getDialParams({
        from,
        sellerId,
        callSid,
        buyerId: eligibleBuyers[0].id.toString(),
        passCallerId,
        recordCall,
      });
      const dial = twiml.dial(dialParams);
      eligibleBuyers.forEach((buyer) => {
        const numAttrs: Record<string, string> = {};
        if (effectiveWhisperUrl) {
          numAttrs.url = effectiveWhisperUrl;
          numAttrs.method = "POST";
        }
        dial.number(numAttrs, buyer.phone);
        markCallActive(buyer.id.toString(), callSid);
      });
      forwardedTo = eligibleBuyers.map((b) => b.phone).join(", ");
      newBuyerId = eligibleBuyers[0]?.id;
      debugLog("Multi-ring initiated", {
        buyerCount: eligibleBuyers.length,
        numbers: forwardedTo,
      });
    } else {
      // Sequential dial
      eligibleBuyers.forEach((buyer, index) => {
        const dialParams = getDialParams({
          from,
          sellerId,
          callSid,
          buyerId: buyer.id.toString(),
          passCallerId,
          recordCall,
        });
        dialWithWhisper(twiml, buyer.phone, dialParams, effectiveWhisperUrl);
        markCallActive(buyer.id.toString(), callSid);
        if (index < eligibleBuyers.length - 1) {
          twiml.pause({ length: 1 });
        }
      });
      forwardedTo = eligibleBuyers.map((b) => b.phone).join(", ");
      newBuyerId = eligibleBuyers[0]?.id;
    }
  } else {
    twiml.say("No forwarding rules configured. Ending call.");
    debugLog("No forwarding rules configured. Call ended.", null, "warn");
  }

  // Create call record with all new fields
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
    leadBuyers: leadBuyers?.map((b: { id: string }) => b.id),
    industry,
    insufficientBalance,
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
  callRate?: { units: number; seconds: number },
) {
  debugLog("Handling no-answer scenario", { callSid, buyerId });

  // Mark buyer call inactive for concurrent tracking
  if (buyerId) {
    markCallInactive(buyerId, callSid);
  }

  // Find the original call record
  const originalCall = await Call.findOne({ callSid });
  if (!originalCall) {
    const errorMessage = `Call record not found for CallSid: ${callSid}`;
    debugLog(errorMessage, null, "error");
    return new NextResponse(
      JSON.stringify({ error: "Call record not found" }),
      {
        status: 404,
      },
    );
  }

  // Update original call status
  originalCall.status = "no-answer";
  await originalCall.save();

  const {
    forwardingType,
    forwardingNumbers,
    leadBuyers,
    industry,
    callRecorded,
    passCallerId,
  } = originalCall;

  const twiml = new twilio.twiml.VoiceResponse();

  // Look up tracking number config for overflow + feature flags
  const trackingConfig = seller.trackingNumbers?.find(
    (num: { phoneNumber: string }) => num.phoneNumber === to,
  );
  const overflowNumber = trackingConfig?.overflowNumber || "";
  const reconnectEnabled = trackingConfig?.reconnectCaller || false;
  const missedCallTextBack = trackingConfig?.missedCallTextBack || false;
  const missedCallTextMessage = trackingConfig?.missedCallTextMessage || "";
  const scheduledCallbackEnabled =
    trackingConfig?.scheduledCallbackEnabled || false;
  const scheduledCallbackDigit = trackingConfig?.scheduledCallbackDigit || "1";
  const geoRoutingEnabled = trackingConfig?.geoRoutingEnabled || false;
  const concurrentCallLimit = trackingConfig?.concurrentCallLimit || 0;
  const multiRingEnabled = trackingConfig?.multiRingEnabled || false;

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
      const baseUrl =
        process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || "";
      twiml.say("All of our representatives are currently unavailable.");
      const gather = twiml.gather({
        numDigits: 1,
        timeout: 5,
        action: `${baseUrl}/api/calls/twilio/callback-request?callSid=${callSid}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&sellerId=${seller._id}&industry=${industry || ""}`,
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

  // Handle different forwarding types for retry
  // Only attempt reconnection if Auto-Reconnect is enabled
  if (!reconnectEnabled) {
    debugLog("Auto-Reconnect disabled — going straight to fallback", {
      callSid,
    });
    handleNoAnswerFallback();
  } else if (forwardingType === "direct") {
    try {
      // Use atomic round-robin for retry as well (Issue #1 fix)
      const { buyer } = await getNextRoundRobinBuyerAtomic(
        seller,
        industry,
        callRate || { units: 1, seconds: 60 },
      );
      const newCallSid = `${callSid}-retry-${Date.now()}`;

      const dialParams = getDialParams({
        from,
        sellerId: seller._id as string,
        callSid: newCallSid,
        buyerId: buyer._id.toString(),
        passCallerId,
        recordCall: callRecorded,
      });
      twiml.dial(dialParams, buyer.phone);

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
      });
    } catch (error) {
      handleNoAnswerFallback();
    }
  } else if (
    forwardingType === "single_multiple" &&
    forwardingNumbers?.length
  ) {
    forwardingNumbers.forEach((num: string | undefined, index: number) => {
      const dialParams = getDialParams({
        from,
        sellerId: seller._id as string,
        callSid: `${callSid}-retry-${index}`,
        passCallerId,
        recordCall: callRecorded,
      });
      twiml.dial(dialParams, num);
      if (index < forwardingNumbers.length - 1) {
        twiml.pause({ length: 1 });
      }
    });
  } else if (forwardingType === "specific_lead" && leadBuyers?.length) {
    // Look up full buyer documents for availability checks
    const retryBuyerIds = leadBuyers.map((b: { id: string }) => b.id);
    const retryBuyerDocs = await Buyer.find({ _id: { $in: retryBuyerIds } });
    const retryBuyerDocMap = new Map(
      retryBuyerDocs.map((b) => [b._id.toString(), b]),
    );

    // Filter lead buyers by availability, business hours, geo, concurrent, and balance
    const eligibleBuyers = [];
    for (const buyer of leadBuyers) {
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
        debugLog("Skipping retry buyer (geo mismatch)", { buyerId: buyer.id });
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

    if (eligibleBuyers.length === 0) {
      handleNoAnswerFallback();
    } else {
      eligibleBuyers.forEach(
        (buyer: { id: string; phone: string | undefined }, index: number) => {
          const dialParams = getDialParams({
            from,
            sellerId: seller._id as string,
            callSid: `${callSid}-retry-${index}`,
            buyerId: buyer.id.toString(),
            passCallerId,
            recordCall: callRecorded,
          });
          twiml.dial(dialParams, buyer.phone);
          if (index < eligibleBuyers.length - 1) {
            twiml.pause({ length: 1 });
          }
        },
      );
    }
  } else {
    twiml.say("No forwarding rules configured. Ending call.");
    debugLog("No forwarding rules configured. Call ended.", null, "warn");
  }

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function handleCallAnswered(
  formData: FormData,
  callSid: string,
  callRate: { units: number; seconds: number },
) {
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
    // Mark call inactive for concurrent tracking
    if (updatedCall.buyerId) {
      markCallInactive(updatedCall.buyerId, callSid);
    }

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
      const tn = seller.trackingNumbers?.find(
        (n: any) => n.industry === updatedCall.industry,
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
}
