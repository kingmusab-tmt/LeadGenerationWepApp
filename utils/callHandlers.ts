// // import twilio from "twilio";
// import { User } from "@/models/user";
// import { Buyer } from "@/models/leadbuyers";
// import Call from "@/models/call";
// import { sendEmail, sendSMS } from "@/utils/notifications";
// // import { io } from "@/server";

// // Debugging utility function
// export const debugLog = (
//   message: string,
//   data?: any,
//   level: "info" | "warn" | "error" = "info"
// ) => {
//   const timestamp = new Date().toISOString();
//   const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

//   if (data) {
//     console[level](logMessage, JSON.stringify(data, null, 2));
//   } else {
//     console[level](logMessage);
//   }
// };

// export const getDialParams = (options: {
//   from: string;
//   sellerId: string;
//   callSid: string;
//   buyerId?: string;
//   passCallerId: boolean;
//   recordCall: boolean;
//   timeout?: number;
// }) => {
//   const dialParams: any = {
//     callerId: options.passCallerId ? options.from : " ",
//     timeout: options.timeout || 30, // Default 30 seconds timeout
//     action: `https://${
//       process.env.NEXT_TEST_PUBLIC_DOMAIN
//     }/api/call_twillo/calls?sellerId=${options.sellerId}&callSid=${
//       options.callSid
//     }&buyerId=${options.buyerId || ""}`,
//   };

//   if (options.recordCall) {
//     dialParams.record = "record-from-answer";
//     dialParams.recordingStatusCallback = `https://${process.env.NEXT_TEST_PUBLIC_DOMAIN}/api/call_twillo/calls`;
//   }

//   return dialParams;
// };
// // Handle round-robin buyer selection
// export const getNextRoundRobinBuyer = async (
//   seller: InstanceType<typeof User>,
//   industry: string
// ) => {
//   const buyers = await Buyer.find({
//     _id: { $in: seller.buyers },
//     "leadPreferences.industry": industry,
//   });

//   if (buyers.length === 0) {
//     throw new Error(`No buyers available for industry: ${industry}`);
//   }

//   const lastAssignedIndex = seller.lastAssignedIndex || 0;
//   const nextBuyerIndex = lastAssignedIndex % buyers.length;
//   const leadBuyer = buyers[nextBuyerIndex];

//   // Update seller's last assigned index
//   seller.lastAssignedIndex = (lastAssignedIndex + 1) % buyers.length;
//   await seller.save();

//   return {
//     buyer: leadBuyer,
//     nextIndex: seller.lastAssignedIndex,
//   };
// };

// // Create a new call record
// export const createCallRecord = async (data: {
//   callSid: string;
//   userId: any;
//   buyerId?: string;
//   from: string;
//   to: string;
//   status: string;
//   callRecorded: boolean;
//   forwardingType: string;
//   forwardingNumbers?: string[];
//   leadBuyers?: any[];
//   industry: string;
// }) => {
//   const newCall = new Call({
//     callSid: data.callSid,
//     userId: data.userId,
//     buyerId: data.buyerId || "",
//     from: data.from,
//     to: data.to,
//     status: data.status,
//     callRecorded: data.callRecorded,
//     forwardingType: data.forwardingType,
//     forwardingNumbers: data.forwardingNumbers,
//     leadBuyers: data.leadBuyers,
//     industry: data.industry,
//   });

//   await newCall.save();
//   return newCall;
// };

// // Update call record with answer details
// export const updateAnsweredCall = async (
//   callSid: string,
//   updateData: {
//     status: string;
//     recordingUrl?: string;
//     callDuration?: number;
//     answeredBy?: string;
//   }
// ) => {
//   return await Call.findOneAndUpdate(
//     { callSid },
//     {
//       status: updateData.status,
//       recordingUrl: updateData.recordingUrl || "No Record",
//       callDuration: updateData.callDuration || null,
//       answeredBy: updateData.answeredBy || "N/A",
//     },
//     { new: true }
//   );
// };

// // Send notifications (email and SMS)
// export const sendNotifications = async (
//   seller: InstanceType<typeof User>,
//   message: string
// ) => {
//   try {
//     await Promise.all([
//       sendEmail(seller.email, "Call Forwarding Update", message).catch((e) =>
//         debugLog("Email sending failed", e, "warn")
//       ),
//       //   sendSMS(seller.mobileNumber, message).catch((e) =>
//       //     debugLog("SMS sending failed", e, "warn")
//       //   ),
//     ]);
//   } catch (error) {
//     debugLog("Notification sending failed", error, "error");
//   }
// };

// // // Emit WebSocket event
// // export const emitWebSocketEvent = (eventData: {
// //   callSid: string;
// //   from: string;
// //   to: string;
// //   userId: any;
// //   buyerId?: string;
// //   status: string;
// //   callRecorded: boolean;
// // }) => {
// //   io.emit("new-lead", eventData);
// // };
// callHandlers.ts
import { User } from "@/models/user";
import { Buyer } from "@/models/leadbuyers";
import Call from "@/models/call";
import { Transaction } from "@/models/transactions";
import { sendEmail, sendSMS } from "@/utils/notifications";

export const debugLog = (
  message: string,
  data?: any,
  level: "info" | "warn" | "error" = "info"
) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console[level](logMessage, data ? JSON.stringify(data, null, 2) : "");
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
  const dialParams: any = {
    callerId: options.passCallerId ? options.from : " ",
    timeout: options.timeout || 30,
    action: `https://${
      process.env.NEXT_PUBLIC_DOMAIN
    }/api/call_twillo/calls?sellerId=${options.sellerId}&callSid=${
      options.callSid
    }&buyerId=${options.buyerId || ""}`,
  };

  if (options.recordCall) {
    dialParams.record = "record-from-answer";
    dialParams.recordingStatusCallback = `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/call_twillo/calls`;
  }

  return dialParams;
};

export const checkBuyerUnitBalance = async (
  buyerId: string,
  requiredUnits: number
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
  callRate: { units: number; seconds: number }
) => {
  // Skip charging for short calls (likely spam/wrong number)
  if (callDuration <= 15) {
    debugLog("Skipping charge for short call", { callDuration });
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
  callRate: { units: number; seconds: number }
) => {
  const buyers = await Buyer.find({
    _id: { $in: seller.buyers },
    "leadPreferences.industry": industry,
  }).sort({ walletUnit: -1 }); // Sort by highest balance first

  if (buyers.length === 0) {
    throw new Error(`No buyers available for industry: ${industry}`);
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
      callRate.units // Minimum units required for this call
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
      `No buyers with sufficient balance for industry: ${industry}`
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

export const createCallRecord = async (data: {
  callSid: string;
  userId: any;
  buyerId?: string;
  from: string;
  to: string;
  status: string;
  callRecorded: boolean;
  forwardingType: string;
  forwardingNumbers?: string[];
  leadBuyers?: any[];
  industry: string;
  unitsCharged?: number;
  insufficientBalance?: boolean;
}) => {
  const newCall = new Call({
    callSid: data.callSid,
    userId: data.userId,
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
  callRate?: { units: number; seconds: number }
) => {
  const update: any = {
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
          callRate
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
  message: string
) => {
  try {
    await Promise.all([
      sendEmail(seller.email, "Call Forwarding Update", message).catch((e) =>
        debugLog("Email sending failed", e, "warn")
      ),
      seller.mobileNumber &&
        sendSMS(seller.mobileNumber, message).catch((e) =>
          debugLog("SMS sending failed", e, "warn")
        ),
    ]);
  } catch (error) {
    debugLog("Notification sending failed", error, "error");
  }
};
