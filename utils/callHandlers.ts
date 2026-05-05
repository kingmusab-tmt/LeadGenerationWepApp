import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import Call from "@/models/call";
import { Transaction } from "@/models/transactions";
import { invalidateCallCache } from "@/lib/cachedSession";
import { CALL_DEFAULTS } from "@/lib/security/callSecurity";
import { env } from "@/lib/env";
import { sendEmail, sendSMS } from "@/utils/notifications";

type VoiceResponse = import("twilio").twiml.VoiceResponse;

type DialParams = {
  callerId: string;
  timeout: number;
  action: string;
  method?: "POST" | "GET";
  record?:
    | "record-from-answer"
    | "do-not-record"
    | "record-from-ringing"
    | "record-from-answer-dual"
    | "record-from-ringing-dual";
  recordingStatusCallback?: string;
};

type BuyerAvailability = {
  acceptOnlyDuringBusinessHours?: boolean;
  workingHours?: { start: string; end: string };
  timezone?: string;
  vacationMode?: {
    enabled: boolean;
    pauseUntil?: Date | string;
    autoReject: boolean;
  };
};

type BuyerResponse = { message: string; digit: string };

const getPublicBaseUrl = (): string => {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    `https://${env.NEXT_PUBLIC_DOMAIN}`;

  return baseUrl.replace(/\/$/, "");
};

type SellerLike = InstanceType<typeof User> & {
  buyers?: Array<{ toString(): string }>;
  lastAssignedIndex?: number;
  industryRoundRobinIndex?: Map<string, number>;
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

export const isBuyerInBusinessHours = (buyer: BuyerAvailability): boolean => {
  if (!buyer.acceptOnlyDuringBusinessHours) return true;

  const { workingHours, timezone } = buyer;
  if (!workingHours?.start || !workingHours?.end) return true;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const currentHour = Number.parseInt(
      parts.find((part) => part.type === "hour")?.value || "0",
      10,
    );
    const currentMinute = Number.parseInt(
      parts.find((part) => part.type === "minute")?.value || "0",
      10,
    );
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = workingHours.start.split(":").map(Number);
    const [endHour, endMinute] = workingHours.end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

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
    return true;
  }
};

export const isBuyerOnVacation = (buyer: BuyerAvailability): boolean => {
  if (!buyer.vacationMode?.enabled) return false;

  if (buyer.vacationMode.pauseUntil) {
    return new Date() < new Date(buyer.vacationMode.pauseUntil);
  }

  return true;
};

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

  const dialParams: DialParams = {
    callerId: options.passCallerId ? options.from : options.overflowNumber,
    timeout: CALL_DEFAULTS.dialTimeout,
    action: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail?callSid=${options.callSid}`,
    method: "POST",
  };

  if (options.recordCall) {
    dialParams.record = "record-from-answer";
    dialParams.recordingStatusCallback = `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail`;
  }

  twiml.dial(dialParams, options.overflowNumber);
};

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
    timeout: 5,
    playBeep: true,
    action: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail?callSid=${options.callSid}`,
    recordingStatusCallback: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail`,
    transcribe: false,
  });
  twiml.say("Thank you for your message. Goodbye.");
};

export const enqueueCallerWithHoldMusic = (
  twiml: VoiceResponse,
  options: {
    sellerId: string;
    industry: string;
  },
) => {
  const queueName = `seller_${options.sellerId}_${options.industry}`;
  const waitUrl = `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/queue?sellerId=${options.sellerId}`;

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
  trackingNumber?: string;
  recordCall: boolean;
  timeout?: number;
}): DialParams => {
  const dialParams: DialParams = {
    callerId:
      options.passCallerId === true
        ? options.from
        : options.trackingNumber || options.from,
    timeout: options.timeout || CALL_DEFAULTS.dialTimeout,
    action: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/calls?sellerId=${options.sellerId}&callSid=${options.callSid}&buyerId=${options.buyerId || ""}`,
  };

  if (options.recordCall) {
    dialParams.record = "record-from-answer";
    dialParams.recordingStatusCallback = `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/calls`;
  }

  return dialParams;
};

export const getWhisperUrl = (options: {
  callWhisper?: string;
  requireResponse?: boolean;
  buyerResponses?: BuyerResponse[];
  sellerId: string;
  callSid: string;
  trackingNumber?: string;
}): string | undefined => {
  const {
    callWhisper,
    requireResponse,
    buyerResponses,
    sellerId,
    callSid,
    trackingNumber,
  } = options;

  if (!callWhisper && !requireResponse) return undefined;

  const params = new URLSearchParams();
  if (callWhisper) params.set("whisper", callWhisper);
  if (requireResponse) params.set("requireResponse", "true");
  if (buyerResponses?.length) {
    params.set("buyerResponses", JSON.stringify(buyerResponses));
  }
  if (trackingNumber) params.set("trackingNumber", trackingNumber);
  params.set("sellerId", sellerId);
  params.set("callSid", callSid);

  return `${getPublicBaseUrl()}/api/calls/twilio/whisper?${params.toString()}`;
};

export const sendMissedCallTextBack = async (
  to: string,
  message: string,
  callSid?: string,
) => {
  try {
    if (!to || !message) return;
    await sendSMS(to, message);
    debugLog("Sent missed-call text-back", { to, callSid });
  } catch (err) {
    debugLog(
      "Failed to send missed-call text-back",
      { err, to, callSid },
      "error",
    );
  }
};

export const dialWithWhisper = (
  twiml: VoiceResponse,
  phoneNumber: string,
  dialParams: DialParams,
  whisperUrl?: string,
) => {
  const dial = twiml.dial(dialParams as never);
  if (whisperUrl) {
    debugLog("Call whisper attached to dial leg", {
      phoneNumber,
      whisperUrl,
      buyerId: (dialParams as { buyerId?: string }).buyerId,
      callSid: (dialParams as { callSid?: string }).callSid,
    });
    dial.number({ url: whisperUrl, method: "POST" }, phoneNumber);
    return;
  }

  dial.number(phoneNumber);
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

  const unitsPerSecond = callRate.units / callRate.seconds;
  const unitsCharged = Math.ceil(callDuration * unitsPerSecond);

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

  buyer.walletUnit -= unitsCharged;
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
  seller: SellerLike,
  industry: string,
  callRate: { units: number; seconds: number },
) => {
  const sellerBuyerIds = seller.buyers ?? [];

  const allBuyers = await Buyer.find({
    _id: { $in: sellerBuyerIds },
    "leadPreferences.industries": industry,
  }).sort({ walletUnit: -1 });

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
  let leadBuyer = null as (typeof buyers)[number] | null;

  while (attempts < buyers.length) {
    const candidate = buyers[nextBuyerIndex];
    const { hasSufficientBalance } = await checkBuyerUnitBalance(
      candidate._id.toString(),
      callRate.units,
    );

    if (hasSufficientBalance) {
      leadBuyer = candidate;
      break;
    }

    debugLog("Buyer has insufficient balance", {
      buyerId: candidate._id,
      requiredUnits: callRate.units,
    });
    attempts++;
    nextBuyerIndex = (nextBuyerIndex + 1) % buyers.length;
  }

  if (!leadBuyer) {
    throw new Error(
      `No buyers with sufficient balance for industry: ${industry}`,
    );
  }

  seller.lastAssignedIndex = (nextBuyerIndex + 1) % buyers.length;
  await seller.save();

  return {
    buyer: leadBuyer,
    nextIndex: seller.lastAssignedIndex,
  };
};

export const getNextRoundRobinBuyerAtomic = async (
  seller: SellerLike,
  industry: string,
  callRate: { units: number; seconds: number },
) => {
  const sellerBuyerIds = seller.buyers ?? [];

  const allBuyers = await Buyer.find({
    _id: { $in: sellerBuyerIds },
    "leadPreferences.industries": industry,
  }).sort({ _id: 1 });

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

  const industryKey = `industryRoundRobinIndex.${industry}`;
  const updatedSeller = await User.findByIdAndUpdate(
    seller._id,
    {
      $inc: { [industryKey]: 1 },
    },
    { new: true },
  );

  if (!updatedSeller) {
    throw new Error(`Seller not found with ID: ${seller._id}`);
  }

  const currentIndex =
    (updatedSeller.industryRoundRobinIndex?.get(industry) as
      | number
      | undefined) ?? 0;
  let nextBuyerIndex = currentIndex % buyers.length;
  let attempts = 0;
  let leadBuyer = null as (typeof buyers)[number] | null;

  while (attempts < buyers.length) {
    const candidate = buyers[nextBuyerIndex];
    const { hasSufficientBalance } = await checkBuyerUnitBalance(
      candidate._id.toString(),
      callRate.units,
    );

    if (hasSufficientBalance) {
      leadBuyer = candidate;
      break;
    }

    debugLog("Buyer has insufficient balance in atomic RR", {
      buyerId: candidate._id,
      requiredUnits: callRate.units,
      industry,
    });
    attempts++;
    nextBuyerIndex = (nextBuyerIndex + 1) % buyers.length;
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
      sendEmail(seller.email, "Call Forwarding Update", message).catch(
        (error) => debugLog("Email sending failed", error, "warn"),
      ),
      seller.mobileNumber &&
        sendSMS(seller.mobileNumber, message).catch((error) =>
          debugLog("SMS sending failed", error, "warn"),
        ),
    ]);
  } catch (error) {
    debugLog("Notification sending failed", error, "error");
  }
};
