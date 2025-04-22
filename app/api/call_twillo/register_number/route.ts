import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";

// Initialize Twilio client with system credentials
const SYSTEM_TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID; // Live Account SID

const SYSTEM_TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN; // Live Auth Token

const systemClient = twilio(
  SYSTEM_TWILIO_ACCOUNT_SID,
  SYSTEM_TWILIO_AUTH_TOKEN
);

export async function POST(req: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();

    // Parse the request body
    const { sellerId, areaCode, industry, method, twilioNumber } =
      await req.json();

    // Validate required fields
    if (!sellerId || !industry || !method) {
      return NextResponse.json(
        { error: "sellerId, industry, and method are required" },
        { status: 400 }
      );
    }

    // Check if the seller exists
    const user = await User.findById(sellerId);
    if (!user) {
      return NextResponse.json(
        { error: "Seller not found. Please provide a valid sellerId." },
        { status: 404 }
      );
    }

    // Check if the seller already has a number for this industry
    const hasExistingNumber = user.trackingNumbers.some(
      (num) => num.industry === industry
    );

    if (hasExistingNumber) {
      return NextResponse.json(
        {
          error: "Seller already has a number for this industry.",
        },
        { status: 400 }
      );
    }

    let purchasedNumber: string;

    if (method === "Manual") {
      // Manual method logic
      if (twilioNumber) {
        // If twilioNumber is provided, skip Twilio request and use the provided number
        purchasedNumber = twilioNumber;
      } else if (areaCode) {
        // If areaCode is provided, use the user's Twilio credentials to request a number
        if (!user.twilioAccountSid || !user.twilioAuthToken) {
          return NextResponse.json(
            {
              error:
                "User Twilio credentials not found. Please set them in settings.",
            },
            { status: 400 }
          );
        }

        const userClient = twilio(user.twilioAccountSid, user.twilioAuthToken);

        // Search for available Twilio numbers
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
            { status: 404 }
          );
        }

        // Purchase the first available number
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
          { status: 400 }
        );
      }
    } else if (method === "Automatic") {
      // Automatic method logic
      if (!areaCode) {
        return NextResponse.json(
          { error: "areaCode is required for Automatic method." },
          { status: 400 }
        );
      }

      // Validate area code format
      if (!/^\d{3}$/.test(areaCode)) {
        return NextResponse.json(
          { error: "Invalid area code. It must be a 3-digit number." },
          { status: 400 }
        );
      }

      // if (process.env.NODE_ENV === "development") {
      //   // Use a test number in development
      //   purchasedNumber = "+15005550006"; // Twilio test number
      // } else {
      // Search for available Twilio numbers in production
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
          { status: 404 }
        );
      }

      // Purchase the first available number
      const purchased = await systemClient.incomingPhoneNumbers.create({
        phoneNumber: numbers[0].phoneNumber,
        friendlyName: `Seller ${sellerId} - ${industry}`,
        voiceUrl: `https://${process.env.NEXT_TEST_PUBLIC_DOMAIN}/api/call_twillo/calls?sellerId=${sellerId}`,
        voiceMethod: "POST",
      });
      purchasedNumber = purchased.phoneNumber;
    } else {
      return NextResponse.json(
        { error: "Invalid method. Must be 'Manual' or 'Automatic'." },
        { status: 400 }
      );
    }

    // Add the purchased number to the seller's tracking numbers
    const session = await User.startSession();
    session.startTransaction();
    try {
      user.trackingNumbers.push({
        phoneNumber: purchasedNumber,
        industry,
        forwardingType: "direct", // Default to direct forwarding
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
      await user.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Return the purchased phone number
    return NextResponse.json({ phoneNumber: purchasedNumber }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/call_twillo/register_number:", error);

    // Handle Twilio-specific errors
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
        { status: 500 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
