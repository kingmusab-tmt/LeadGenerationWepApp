import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import Call from "@/models/call";
import {
  debugLog,
  getDialParams,
  getNextRoundRobinBuyer,
  createCallRecord,
  updateAnsweredCall,
  sendNotifications,
  checkBuyerUnitBalance,
  // chargeBuyerForCall,
} from "@/utils/callHandlers";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  debugLog("Incoming call request received");

  try {
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
        callRate
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
        callRate
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
      "error"
    );

    return new NextResponse(
      JSON.stringify({
        error: "Call handling failed",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : null,
      }),
      { status: 500 }
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
  callRate: { units: number; seconds: number }
) {
  debugLog("Handling new call");

  // Find the tracking number configuration
  const trackingNumber = seller.trackingNumbers.find(
    (num) => num.phoneNumber === to
  );

  if (!trackingNumber) {
    const errorMessage = `Industry mapping not found for to: ${to}`;
    debugLog(
      errorMessage,
      {
        to,
        availableNumbers: seller.trackingNumbers.map((n) => n.phoneNumber),
      },
      "error"
    );
    return new NextResponse(
      JSON.stringify({ error: "Industry mapping not found" }),
      { status: 404 }
    );
  }

  const {
    industry,
    forwardingType,
    forwardingNumbers,
    leadBuyers,
    recordCall,
    welcomeMessage,
    passCallerId,
  } = trackingNumber;

  debugLog("Tracking number configuration", {
    industry,
    forwardingType,
    forwardingNumbers,
    leadBuyers: leadBuyers?.length,
    recordCall,
    welcomeMessage: !!welcomeMessage,
    passCallerId,
  });

  // Initialize TwiML response
  const twiml = new twilio.twiml.VoiceResponse();
  let forwardedTo = "";
  let newBuyerId = "";
  let insufficientBalance = false;

  // Play welcome message if set
  if (welcomeMessage) {
    twiml.say(welcomeMessage);
    debugLog("Welcome message added to TwiML", { welcomeMessage });
  }

  // Handle different forwarding types
  if (forwardingType === "direct") {
    try {
      const { buyer } = await getNextRoundRobinBuyer(
        seller,
        industry,
        callRate
      );
      forwardedTo = buyer.phone;
      newBuyerId = buyer._id.toString();

      const dialParams = getDialParams({
        from,
        sellerId,
        callSid,
        buyerId: newBuyerId,
        passCallerId,
        recordCall,
      });
      twiml.dial(dialParams, forwardedTo);
    } catch (error) {
      insufficientBalance = true;
      twiml.say(
        "No available buyers with sufficient balance. Please try again later."
      );
      debugLog(
        "No buyers with sufficient balance",
        { error: error instanceof Error ? error.message : "Unknown error" },
        "warn"
      );
    }
  } else if (
    forwardingType === "single_multiple" &&
    forwardingNumbers?.length
  ) {
    forwardingNumbers.forEach((num, index) => {
      const dialParams = getDialParams({
        from,
        sellerId,
        callSid,
        passCallerId,
        recordCall,
      });
      twiml.dial(dialParams, num);
      if (index < forwardingNumbers.length - 1) {
        twiml.pause({ length: 1 });
      }
    });
    forwardedTo = forwardingNumbers.join(", ");
  } else if (forwardingType === "specific_lead" && leadBuyers?.length) {
    // Filter lead buyers with sufficient balance
    const eligibleBuyers = [];
    for (const buyer of leadBuyers) {
      try {
        const { hasSufficientBalance } = await checkBuyerUnitBalance(
          buyer.id.toString(),
          callRate.units
        );
        if (hasSufficientBalance) {
          eligibleBuyers.push(buyer);
        }
      } catch (error) {
        debugLog(
          "Error checking buyer balance",
          { buyerId: buyer.id, error },
          "warn"
        );
      }
    }

    if (eligibleBuyers.length === 0) {
      insufficientBalance = true;
      twiml.say(
        "No available buyers with sufficient balance. Please try again later."
      );
      debugLog("No eligible buyers with sufficient balance", null, "warn");
    } else {
      eligibleBuyers.forEach((buyer, index) => {
        const dialParams = getDialParams({
          from,
          sellerId,
          callSid,
          buyerId: buyer.id.toString(),
          passCallerId,
          recordCall,
        });
        twiml.dial(dialParams, buyer.phone);
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

  // Create call record
  const newCall = await createCallRecord({
    callSid,
    userId: seller._id,
    buyerId: newBuyerId,
    from,
    to: forwardedTo || to,
    status: insufficientBalance ? "insufficient_balance" : "forwarded",
    callRecorded: recordCall,
    forwardingType,
    forwardingNumbers,
    leadBuyers,
    industry,
    insufficientBalance,
  });

  debugLog("New call record created", { callId: newCall._id });

  // Send notifications
  await sendNotifications(
    seller,
    `A call from ${from} has been ${
      insufficientBalance
        ? "not forwarded due to insufficient buyer balance"
        : `forwarded to ${forwardedTo || to}`
    }.`
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
  callRate?: { units: number; seconds: number }
) {
  debugLog("Handling no-answer scenario", { callSid, buyerId });

  // Find the original call record
  const originalCall = await Call.findOne({ callSid });
  if (!originalCall) {
    const errorMessage = `Call record not found for CallSid: ${callSid}`;
    debugLog(errorMessage, null, "error");
    return new NextResponse(
      JSON.stringify({ error: "Call record not found" }),
      {
        status: 404,
      }
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

  // Handle different forwarding types for retry
  if (forwardingType === "direct") {
    try {
      const { buyer } = await getNextRoundRobinBuyer(
        seller,
        industry,
        callRate || { units: 1, seconds: 60 }
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
        userId: seller._id,
        buyerId: buyer._id.toString(),
        from,
        to: buyer.phone,
        status: "forwarded",
        callRecorded,
        forwardingType,
        forwardingNumbers,
        leadBuyers,
        industry,
      });
    } catch (error) {
      twiml.say(
        "No available buyers with sufficient balance. Please try again later."
      );
      debugLog(
        "No buyers with sufficient balance for retry",
        { error: error instanceof Error ? error.message : "Unknown error" },
        "warn"
      );
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
    // Filter lead buyers with sufficient balance
    const eligibleBuyers = [];
    for (const buyer of leadBuyers) {
      try {
        const { hasSufficientBalance } = await checkBuyerUnitBalance(
          buyer.id.toString(),
          callRate?.units || 1
        );
        if (hasSufficientBalance) {
          eligibleBuyers.push(buyer);
        }
      } catch (error) {
        debugLog(
          "Error checking buyer balance",
          { buyerId: buyer.id, error },
          "warn"
        );
      }
    }

    if (eligibleBuyers.length === 0) {
      twiml.say(
        "No available buyers with sufficient balance. Please try again later."
      );
      debugLog(
        "No eligible buyers with sufficient balance for retry",
        null,
        "warn"
      );
    } else {
      eligibleBuyers.forEach(
        (
          buyer: { id: { toString: () => any }; phone: string | undefined },
          index: number
        ) => {
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
        }
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
  callRate: { units: number; seconds: number }
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
    callRate
  );

  return new NextResponse(
    JSON.stringify({
      success: true,
      updatedCall,
      unitsCharged: updatedCall?.unitsCharged || 0,
    }),
    {
      status: 200,
    }
  );
}
