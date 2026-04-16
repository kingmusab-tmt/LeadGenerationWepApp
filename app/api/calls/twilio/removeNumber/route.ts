import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { env } from "@/lib/env";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Get the session to fetch the current user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return unauthorized("Unauthorized. Please log in.");
    }

    let body: { phoneNumber?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON in request body");
    }

    const { phoneNumber } = body;
    if (!phoneNumber) {
      return badRequest("phoneNumber is required");
    }

    // Find the current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return notFound("User");
    }

    // Find the tracking number in the user's trackingNumbers array
    const trackingNumber = user.trackingNumbers.find(
      (num) => num.phoneNumber === phoneNumber,
    );

    if (!trackingNumber) {
      return notFound("Tracking number");
    }

    // Determine which Twilio credentials to use based on the method
    let twilioAccountSid: string;
    let twilioAuthToken: string;

    if (trackingNumber.method === "Manual") {
      // Use the user's Twilio credentials
      if (!user.twilioAccountSid || !user.twilioAuthToken) {
        return badRequest("User Twilio credentials not found");
      }
      twilioAccountSid = user.twilioAccountSid;
      twilioAuthToken = user.twilioAuthToken;
    } else if (trackingNumber.method === "Automatic") {
      // Use the system's Twilio credentials
      twilioAccountSid = env.TWILIO_ACCOUNT_SID;
      twilioAuthToken = env.TWILIO_AUTH_TOKEN;
    } else {
      return badRequest("Invalid tracking number method");
    }

    // Initialize Twilio client with the appropriate credentials
    const client = twilio(twilioAccountSid, twilioAuthToken);

    // Remove the number from the Twilio account
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: trackingNumber.phoneNumber,
    });

    if (incomingPhoneNumbers.length > 0) {
      const twilioNumber = incomingPhoneNumbers[0];
      await client.incomingPhoneNumbers(twilioNumber.sid).remove();
    }

    // Remove the number from the user's trackingNumbers array
    user.trackingNumbers = user.trackingNumbers.filter(
      (num) => num.phoneNumber !== phoneNumber,
    );
    await user.save();

    return NextResponse.json(
      { success: true, data: { message: "Number removed" } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in POST /api/remove_number:", error);

    // Handle Twilio-specific errors
    if (error instanceof Error && "code" in error) {
      let errorMessage = error.message;
      if (error.code === 20003) {
        errorMessage =
          "Twilio authentication failed. Please check your credentials.";
      } else if (error.code === 20404) {
        errorMessage = "Twilio number not found.";
      }
      return NextResponse.json(
        {
          success: false,
          error: `Twilio error: ${errorMessage} (Code: ${error.code})`,
        },
        { status: 500 },
      );
    }

    // Handle generic errors
    return internalError("Failed to remove number");
  }
}
