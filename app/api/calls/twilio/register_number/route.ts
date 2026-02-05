import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// Initialize Twilio client with system credentials
const SYSTEM_TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const SYSTEM_TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const systemClient = twilio(
  SYSTEM_TWILIO_ACCOUNT_SID,
  SYSTEM_TWILIO_AUTH_TOKEN,
);

export async function POST(req: NextRequest) {
  try {
    const userSession = await getServerSession(authOptions);

    if (!userSession || !userSession.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userSession.user.role !== "seller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { sellerId, areaCode, industry, method, twilioNumber } =
      await req.json();

    // Validate required fields
    if (!sellerId || !industry || !method) {
      return NextResponse.json(
        { error: "sellerId, industry, and method are required" },
        { status: 400 },
      );
    }

    // Check if the seller exists and populate subscription
    const user = await User.findById(sellerId).select(
      "+subscription +trackingNumbers",
    );
    if (!user) {
      return NextResponse.json(
        { error: "Seller not found. Please provide a valid sellerId." },
        { status: 404 },
      );
    }

    // Check subscription limits
    const subscription = user.subscription;
    if (!subscription || !subscription.isSubscriptionActive) {
      return NextResponse.json(
        {
          error:
            "No active subscription found. Please subscribe to a plan first.",
        },
        { status: 403 },
      );
    }

    const currentTwilioNumbers = user.trackingNumbers.length;
    const maxAllowed = subscription.subscriptionLimits?.twilioNumbers || 0;

    if (currentTwilioNumbers >= maxAllowed) {
      return NextResponse.json(
        {
          error: "You've reached your Twilio number limit.",
          limitReached: true,
          currentCount: currentTwilioNumbers,
          maxAllowed: maxAllowed,
          message: `Your current plan allows for ${maxAllowed} Twilio numbers. Please upgrade your subscription to add more numbers.`,
        },
        { status: 403 },
      );
    }

    // Check if the seller already has a number for this industry
    const hasExistingNumber = user.trackingNumbers.some(
      (num) => num.industry === industry,
    );

    if (hasExistingNumber) {
      return NextResponse.json(
        {
          error: "You already have a number for this industry.",
        },
        { status: 400 },
      );
    }

    let purchasedNumber: string;

    if (method === "Manual") {
      if (twilioNumber) {
        purchasedNumber = twilioNumber;
      } else if (areaCode) {
        if (!user.twilioAccountSid || !user.twilioAuthToken) {
          return NextResponse.json(
            {
              error:
                "Twilio credentials not found. Please set them in settings.",
            },
            { status: 400 },
          );
        }

        const userClient = twilio(user.twilioAccountSid, user.twilioAuthToken);
        const numbers = await userClient
          .availablePhoneNumbers("US")
          .local.list({
            areaCode,
            limit: 1,
            smsEnabled: true,
            voiceEnabled: true,
          });

        if (numbers.length === 0) {
          return NextResponse.json(
            { error: "No available phone numbers for the provided area code." },
            { status: 404 },
          );
        }

        const purchased = await userClient.incomingPhoneNumbers.create({
          phoneNumber: numbers[0].phoneNumber,
          friendlyName: `Seller ${sellerId} - ${industry}`,
          voiceUrl: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/call_twilio/calls?sellerId=${sellerId}`,
          voiceMethod: "POST",
        });
        purchasedNumber = purchased.phoneNumber;
      } else {
        return NextResponse.json(
          {
            error:
              "Either areaCode or twilioNumber must be provided for Manual method.",
          },
          { status: 400 },
        );
      }
    } else if (method === "Automatic") {
      if (!areaCode) {
        return NextResponse.json(
          { error: "areaCode is required for Automatic method." },
          { status: 400 },
        );
      }

      if (!/^\d{3}$/.test(areaCode)) {
        return NextResponse.json(
          { error: "Invalid area code. It must be a 3-digit number." },
          { status: 400 },
        );
      }

      const numbers = await systemClient
        .availablePhoneNumbers("US")
        .local.list({
          areaCode,
          limit: 1,
          smsEnabled: true,
          voiceEnabled: true,
        });

      if (numbers.length === 0) {
        return NextResponse.json(
          { error: "No available phone numbers for the provided area code." },
          { status: 404 },
        );
      }

      const purchased = await systemClient.incomingPhoneNumbers.create({
        phoneNumber: numbers[0].phoneNumber,
        friendlyName: `Seller ${sellerId} - ${industry}`,
        voiceUrl: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/call_twilio/calls?sellerId=${sellerId}`,
        voiceMethod: "POST",
      });
      purchasedNumber = purchased.phoneNumber;
    } else {
      return NextResponse.json(
        { error: "Invalid method. Must be 'Manual' or 'Automatic'." },
        { status: 400 },
      );
    }

    // Add the purchased number to the seller's tracking numbers
    const dbSession = await User.startSession();
    dbSession.startTransaction();
    try {
      user.trackingNumbers.push({
        phoneNumber: purchasedNumber,
        industry,
        forwardingType: "direct",
        method,
        recordCall: false,
        reconnectCaller: false,
        passCallerId: false,
        leadSource: "",
        welcomeMessage: "",
        callWhisper: "",
        requireResponse: false,
        forwardingNumbers: [],
        leadBuyers: [],
      });
      await user.save({ session: dbSession });
      await dbSession.commitTransaction();
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }

    return NextResponse.json(
      {
        phoneNumber: purchasedNumber,
        currentCount: currentTwilioNumbers + 1,
        maxAllowed: maxAllowed,
        message: `You've used ${
          currentTwilioNumbers + 1
        } of ${maxAllowed} allowed Twilio numbers.`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in POST /api/call_twilio/register_number:", error);

    if (error instanceof Error && "code" in error) {
      let errorMessage = error.message;
      if (error.code === 21211) {
        errorMessage =
          "Invalid area code. Please provide a valid 3-digit area code.";
      } else if (error.code === 20003) {
        errorMessage =
          "Twilio authentication failed. Please check your credentials.";
      }
      return NextResponse.json(
        { error: `Twilio error: ${errorMessage} (Code: ${error.code})` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
// This file is part of the Twilio integration for registering a new tracking number.
// It connects to the database, checks the user's subscription limits,
// and registers a new Twilio number based on the provided parameters.
// It handles both manual and automatic number registration methods,
// and ensures the user does not exceed their allowed number of tracking numbers.
// It also validates the input parameters and handles errors gracefully.
// The response includes the newly registered phone number and the updated count of tracking numbers.
// It uses the Twilio API to manage phone numbers and integrates with Next.js API routes.
// The code is designed to be secure, ensuring that only authenticated sellers can register numbers,
// and it provides appropriate error messages for various failure scenarios.
// The Twilio client is initialized with system credentials for automatic number registration,
// while user-specific credentials are used for manual registration.
// The code is structured to handle both success and error responses appropriately,
// ensuring a smooth user experience when registering new tracking numbers.
// It also includes detailed logging for debugging purposes.
