// Project: call-forwarding-app
// File Created: 2023-10-01 12:00:00
// Description: This code handles call forwarding and buyer assignment logic for a call forwarding application. It includes functions to check buyer balances, charge buyers for calls, and send notifications via email and SMS.
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import Call from "@/models/call";
import { Transaction } from "@/models/transactions";
import { sendEmail, sendSMS } from "@/utils/notifications";
import { invalidateCallCache, invalidateLeadCache } from "@/lib/cachedSession"; // PHASE 3: Cache invalidation
import { CALL_DEFAULTS } from "@/lib/security/callSecurity";

type VoiceResponse = import("twilio").twiml.VoiceResponse;

type DialParams = {
  callerId: string;
  timeout: number;
  action: string;
  record?:
    | "record-from-answer"
    | "do-not-record"
    | "record-from-ringing"
    | "record-from-answer-dual"
    | "record-from-ringing-dual";
  recordingStatusCallback?: string;
};

export const debugLog = (
  message: string,
  data?: unknown,
  level: "info" | "warn" | "error" = "info",
) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console[level](logMessage, data ? JSON.stringify(data, null, 2) : "");
};

/**
 * Check if a buyer is currently within their business hours.
 * Uses the buyer's configured timezone (defaults to UTC).
 * Returns true if business hours checking is disabled OR if currently within hours.
 */
export const isBuyerInBusinessHours = (buyer: {
  acceptOnlyDuringBusinessHours?: boolean;
  workingHours?: { start: string; end: string };
  timezone?: string;
}): boolean => {
  // If buyer doesn't enforce business hours, always available
  if (!buyer.acceptOnlyDuringBusinessHours) return true;

  const { workingHours, timezone } = buyer;
  if (!workingHours?.start || !workingHours?.end) return true; // No hours configured = always available

  try {
    // Get current time in buyer's timezone
    const tz = timezone || "UTC";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(
      parts.find((p) => p.type === "hour")?.value || "0",
    );
    const currentMinute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
    );
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startH, startM] = workingHours.start.split(":").map(Number);
    const [endH, endM] = workingHours.end.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight hours (e.g., 22:00 - 06:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch (error) {
    debugLog(
      "Error checking business hours",
      { error, timezone: buyer.timezone },
      "warn",
    );
    return true; // Fail open — don't block calls on timezone errors
  }
};

/**
 * Check if a buyer is on vacation mode.
 * Returns true if buyer IS on vacation (should be skipped).
 */
export const isBuyerOnVacation = (buyer: {
  vacationMode?: {
    enabled: boolean;
    pauseUntil?: Date;
    autoReject: boolean;
  };
}): boolean => {
  if (!buyer.vacationMode?.enabled) return false;

  // If pauseUntil is set and has passed, vacation is over
  if (buyer.vacationMode.pauseUntil) {
    return new Date() < new Date(buyer.vacationMode.pauseUntil);
  }

  // Vacation mode enabled with no end date
  return true;
};

/**
 * Attempt overflow to an external number before falling back to voicemail.
 * Dials the overflow number with a timeout; if no answer, the action URL
 * triggers voicemail via the existing no-answer handler.
 */
export const addOverflowToTwiml = (
  twiml: VoiceResponse,
  options: {
    overflowNumber: string;
    sellerId: string;
    callSid: string;
    from: string;
    passCallerId: boolean;
    recordCall: boolean;
  },
) => {
  twiml.say(
    "All agents are currently unavailable. We are connecting you to an alternative line.",
  );

  const dialParams: Record<string, unknown> = {
    callerId: options.passCallerId ? options.from : options.overflowNumber,
    timeout: CALL_DEFAULTS.dialTimeout,
    action: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail?callSid=${options.callSid}`,
    method: "POST" as const,
  };
  if (options.recordCall) {
    dialParams.record = "record-from-answer";
  }

  twiml.dial(dialParams, options.overflowNumber);
};

/**
 * Add voicemail recording to a TwiML response.
 * Plays a message then records. The recording callback updates the call record.
 */
export const addVoicemailToTwiml = (
  twiml: VoiceResponse,
  options: {
    sellerId: string;
    callSid: string;
    message?: string;
  },
) => {
  const voicemailMessage =
    options.message ||
    "No one is available to take your call right now. Please leave a message after the beep, and we will get back to you as soon as possible.";

  twiml.say(voicemailMessage);
  twiml.record({
    maxLength: CALL_DEFAULTS.voicemailMaxLength,
    timeout: 5, // 5 seconds of silence before stopping
    playBeep: true,
    action: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail?callSid=${options.callSid}`,
    recordingStatusCallback: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail`,
    transcribe: false, // Set to true if Twilio transcription is enabled
  });
  twiml.say("Thank you for your message. Goodbye.");
};

/**
 * Add a caller to a hold queue with music.
 * Used when buyers exist but are temporarily busy.
 */
export const enqueueCallerWithHoldMusic = (
  twiml: VoiceResponse,
  options: {
    sellerId: string;
    industry: string;
  },
) => {
  const queueName = `seller_${options.sellerId}_${options.industry}`;
  const waitUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/queue?sellerId=${options.sellerId}`;

  twiml.say(
    "All agents are currently busy. Please hold and we will connect you shortly.",
  );
  twiml.enqueue(
    {
      waitUrl,
      waitUrlMethod: "POST",
    },
    queueName,
  );
};

export const getDialParams = (options: {
  from: string;
  sellerId: string;
  callSid: string;
  buyerId?: string;
  passCallerId: boolean;
  recordCall: boolean;
  timeout?: number;
}) => {
  const dialParams: DialParams = {
    callerId: options.passCallerId ? options.from : " ",
    timeout: options.timeout || CALL_DEFAULTS.dialTimeout,
    action: `https://${
      process.env.NEXT_PUBLIC_DOMAIN
    }/api/calls/twilio/calls?sellerId=${options.sellerId}&callSid=${
      options.callSid
    }&buyerId=${options.buyerId || ""}`,
  };

  if (options.recordCall) {
    dialParams.record = "record-from-answer";
    dialParams.recordingStatusCallback = `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/calls`;
  }

  return dialParams;
};

/**
 * Build the whisper/screening URL for a buyer's <Number> element.
 * Returns undefined if no whisper or screening is configured.
 */
export const getWhisperUrl = (options: {
  callWhisper?: string;
  requireResponse?: boolean;
  buyerResponses?: { message: string; digit: string }[];
  sellerId: string;
  callSid: string;
}): string | undefined => {
  const { callWhisper, requireResponse, buyerResponses, sellerId, callSid } =
    options;

  // Only build URL if whisper or screening is configured
  if (!callWhisper && !requireResponse) return undefined;

  const params = new URLSearchParams();
  if (callWhisper) params.set("whisper", callWhisper);
  if (requireResponse) params.set("requireResponse", "true");
  if (buyerResponses?.length) {
    params.set(
      "buyerResponses",
      encodeURIComponent(JSON.stringify(buyerResponses)),
    );
  }
  params.set("sellerId", sellerId);
  params.set("callSid", callSid);

  return `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/whisper?${params.toString()}`;
};

/**
 * Add a <Dial><Number> to TwiML with optional whisper/screening.
 * Uses the `url` attribute on <Number> so the whisper plays to the callee (buyer)
 * before the two parties are bridged.
 */
export const dialWithWhisper = (
  twiml: VoiceResponse,
  phoneNumber: string,
  dialParams: DialParams,
  whisperUrl?: string,
) => {
  const dial = twiml.dial(dialParams);
  if (whisperUrl) {
    dial.number({ url: whisperUrl, method: "POST" }, phoneNumber);
  } else {
    dial.number(phoneNumber);
  }
};

export const checkBuyerUnitBalance = async (
  buyerId: string,
  requiredUnits: number,
) => {
  const buyer = await Buyer.findById(buyerId);
  if (!buyer) {
    throw new Error(`Buyer not found with ID: ${buyerId}`);
  }

  return {
    hasSufficientBalance: buyer.walletUnit >= requiredUnits,
    currentBalance: buyer.walletUnit,
    buyer,
  };
};

export const chargeBuyerForCall = async (
  buyerId: string,
  callDuration: number,
  callSid: string,
  callRate: { units: number; seconds: number },
) => {
  // Skip charging for short calls (likely spam/wrong number)
  if (callDuration <= CALL_DEFAULTS.minBillableDuration) {
    debugLog("Skipping charge for short call", {
      callDuration,
      minBillable: CALL_DEFAULTS.minBillableDuration,
    });
    return { charged: false, unitsCharged: 0 };
  }

  const buyer = await Buyer.findById(buyerId);
  if (!buyer) {
    throw new Error(`Buyer not found with ID: ${buyerId}`);
  }

  // Calculate units to charge based on call duration and rate
  const unitsPerSecond = callRate.units / callRate.seconds;
  const unitsCharged = Math.ceil(callDuration * unitsPerSecond);

  // Create transaction record
  const transaction = new Transaction({
    userId: buyerId,
    callId: callSid,
    amount: unitsCharged,
    type: "call_purchase",
    status: "completed",
    description: `Call charge for ${callDuration} seconds at ${callRate.units} units per ${callRate.seconds} seconds`,
    balanceBefore: buyer.walletUnit,
    balanceAfter: buyer.walletUnit - unitsCharged,
  });

  // Update buyer's balance (can go negative)
  buyer.walletUnit -= unitsCharged;

  // Save changes
  await Promise.all([buyer.save(), transaction.save()]);

  debugLog("Buyer charged for call", {
    buyerId,
    callDuration,
    unitsCharged,
    newBalance: buyer.walletUnit,
  });

  return { charged: true, unitsCharged };
};

export const getNextRoundRobinBuyer = async (
  seller: InstanceType<typeof User>,
  industry: string,
  callRate: { units: number; seconds: number },
) => {
  const allBuyers = await Buyer.find({
    _id: { $in: seller.buyers },
    "leadPreferences.industries": industry,
  }).sort({ walletUnit: -1 }); // Sort by highest balance first

  // Filter out buyers on vacation or outside business hours
  const buyers = allBuyers.filter((buyer) => {
    if (isBuyerOnVacation(buyer)) {
      debugLog("Skipping buyer on vacation", { buyerId: buyer._id });
      return false;
    }
    if (!isBuyerInBusinessHours(buyer)) {
      debugLog("Skipping buyer outside business hours", {
        buyerId: buyer._id,
        workingHours: buyer.workingHours,
        timezone: buyer.timezone,
      });
      return false;
    }
    return true;
  });

  if (buyers.length === 0) {
    throw new Error(
      `No buyers available for industry: ${industry} (all buyers are outside business hours, on vacation, or no match)`,
    );
  }

  const lastAssignedIndex = seller.lastAssignedIndex || 0;
  let nextBuyerIndex = lastAssignedIndex % buyers.length;
  let attempts = 0;
  let leadBuyer = null;

  // Find the next buyer with sufficient balance
  while (attempts < buyers.length) {
    const candidate = buyers[nextBuyerIndex];
    const { hasSufficientBalance } = await checkBuyerUnitBalance(
      candidate._id.toString(),
      callRate.units, // Minimum units required for this call
    );

    if (hasSufficientBalance) {
      leadBuyer = candidate;
      break;
    } else {
      debugLog("Buyer has insufficient balance", {
        buyerId: candidate._id,
        requiredUnits: callRate.units,
      });
      attempts++;
      nextBuyerIndex = (nextBuyerIndex + 1) % buyers.length;
    }
  }

  if (!leadBuyer) {
    throw new Error(
      `No buyers with sufficient balance for industry: ${industry}`,
    );
  }

  // Update seller's last assigned index
  seller.lastAssignedIndex = (nextBuyerIndex + 1) % buyers.length;
  await seller.save();

  return {
    buyer: leadBuyer,
    nextIndex: seller.lastAssignedIndex,
  };
};

/**
 * ATOMIC ROUND-ROBIN ASSIGNMENT (Issue #1 Resolution)
 * Uses MongoDB atomic increment operation to prevent race conditions
 * with concurrent calls. Each industry maintains its own counter.
 *
 * @param seller - The seller document
 * @param industry - The industry/niche for filtering buyers
 * @param callRate - Call charging rate
 * @returns Next buyer for round-robin assignment
 */
export const getNextRoundRobinBuyerAtomic = async (
  seller: InstanceType<typeof User>,
  industry: string,
  callRate: { units: number; seconds: number },
) => {
  const allBuyers = await Buyer.find({
    _id: { $in: seller.buyers },
    "leadPreferences.industries": industry,
  }).sort({ _id: 1 }); // STABLE SORT by ID to prevent index drift (Issue #3 fix)

  // Filter out buyers on vacation or outside business hours
  const buyers = allBuyers.filter((buyer) => {
    if (isBuyerOnVacation(buyer)) {
      debugLog("Skipping buyer on vacation (atomic RR)", {
        buyerId: buyer._id,
      });
      return false;
    }
    if (!isBuyerInBusinessHours(buyer)) {
      debugLog("Skipping buyer outside business hours (atomic RR)", {
        buyerId: buyer._id,
        workingHours: buyer.workingHours,
        timezone: buyer.timezone,
      });
      return false;
    }
    return true;
  });

  if (buyers.length === 0) {
    throw new Error(
      `No buyers available for industry: ${industry} (all buyers are outside business hours, on vacation, or no match)`,
    );
  }

  // ATOMIC INCREMENT using MongoDB $inc operator
  // This ensures thread-safe update without race conditions
  const industryKey = `industryRoundRobinIndex.${industry}`;
  const updatedSeller = await User.findByIdAndUpdate(
    seller._id,
    {
      $inc: { [industryKey]: 1 }, // Atomic increment
    },
    { new: true },
  );

  if (!updatedSeller) {
    throw new Error(`Seller not found with ID: ${seller._id}`);
  }

  // Get the current index from updated seller
  const currentIndex =
    (updatedSeller.industryRoundRobinIndex?.get(industry) as
      | number
      | undefined) ?? 0;
  let nextBuyerIndex = currentIndex % buyers.length;
  let attempts = 0;
  let leadBuyer = null;

  // Find the next buyer with sufficient balance
  while (attempts < buyers.length) {
    const candidate = buyers[nextBuyerIndex];
    const { hasSufficientBalance } = await checkBuyerUnitBalance(
      candidate._id.toString(),
      callRate.units,
    );

    if (hasSufficientBalance) {
      leadBuyer = candidate;
      break;
    } else {
      debugLog("Buyer has insufficient balance in atomic RR", {
        buyerId: candidate._id,
        requiredUnits: callRate.units,
        industry,
      });
      attempts++;
      nextBuyerIndex = (nextBuyerIndex + 1) % buyers.length;
    }
  }

  if (!leadBuyer) {
    throw new Error(
      `No buyers with sufficient balance for industry: ${industry}`,
    );
  }

  debugLog("Atomic round-robin assignment successful", {
    sellerId: seller._id,
    industry,
    assignedBuyerId: leadBuyer._id,
    currentIndex,
    buyerIndex: nextBuyerIndex,
    totalBuyers: buyers.length,
  });

  return {
    buyer: leadBuyer,
    currentIndex,
    nextIndex: nextBuyerIndex,
  };
};

export const createCallRecord = async (data: {
  callSid: string;
  userId: string | { toString: () => string };
  buyerId?: string;
  from: string;
  to: string;
  status: string;
  callRecorded: boolean;
  forwardingType: string;
  forwardingNumbers?: string[];
  leadBuyers?: string[];
  industry: string;
  unitsCharged?: number;
  insufficientBalance?: boolean;
}) => {
  const newCall = new Call({
    callSid: data.callSid,
    userId:
      typeof data.userId === "string" ? data.userId : data.userId.toString(),
    buyerId: data.buyerId || "",
    from: data.from,
    to: data.to,
    status: data.status,
    callRecorded: data.callRecorded,
    forwardingType: data.forwardingType,
    forwardingNumbers: data.forwardingNumbers,
    leadBuyers: data.leadBuyers,
    industry: data.industry,
    unitsCharged: data.unitsCharged,
    insufficientBalance: data.insufficientBalance || false,
  });

  await newCall.save();

  // PHASE 3: Invalidate call cache after creating call record
  await invalidateCallCache(newCall._id?.toString() || "");

  return newCall;
};

export const updateAnsweredCall = async (
  callSid: string,
  updateData: {
    status: string;
    recordingUrl?: string;
    callDuration?: number;
    answeredBy?: string;
  },
  callRate?: { units: number; seconds: number },
) => {
  const update: {
    status: string;
    recordingUrl: string;
    callDuration: number | null;
    answeredBy: string;
    unitsCharged?: number;
  } = {
    status: updateData.status,
    recordingUrl: updateData.recordingUrl || "No Record",
    callDuration: updateData.callDuration || null,
    answeredBy: updateData.answeredBy || "N/A",
  };

  // Charge buyer if call was answered and duration is available
  if (
    updateData.status === "completed" &&
    updateData.callDuration &&
    callRate &&
    updateData.callDuration > 15
  ) {
    try {
      const call = await Call.findOne({ callSid });
      if (call?.buyerId) {
        const { unitsCharged } = await chargeBuyerForCall(
          call.buyerId,
          updateData.callDuration,
          callSid,
          callRate,
        );
        update.unitsCharged = unitsCharged;
      }
    } catch (error) {
      debugLog("Failed to charge buyer for call", error, "error");
    }
  }

  return await Call.findOneAndUpdate({ callSid }, update, { new: true });
};

export const sendNotifications = async (
  seller: InstanceType<typeof User>,
  message: string,
) => {
  try {
    await Promise.all([
      sendEmail(seller.email, "Call Forwarding Update", message).catch((e) =>
        debugLog("Email sending failed", e, "warn"),
      ),
      seller.mobileNumber &&
        sendSMS(seller.mobileNumber, message).catch((e) =>
          debugLog("SMS sending failed", e, "warn"),
        ),
    ]);
  } catch (error) {
    debugLog("Notification sending failed", error, "error");
  }
};
