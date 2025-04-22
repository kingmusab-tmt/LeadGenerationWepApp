import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Get the session to fetch the current user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401 }
      );
    }

    const { phoneNumber } = await req.json();

    // Find the current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    // Find the tracking number in the user's trackingNumbers array
    const trackingNumber = user.trackingNumbers.find(
      (num) => num.phoneNumber === phoneNumber
    );

    if (!trackingNumber) {
      return new NextResponse(
        JSON.stringify({ error: "Tracking number not found" }),
        { status: 404 }
      );
    }

    // Determine which Twilio credentials to use based on the method
    let twilioAccountSid: string;
    let twilioAuthToken: string;

    if (trackingNumber.method === "Manual") {
      // Use the user's Twilio credentials
      if (!user.twilioAccountSid || !user.twilioAuthToken) {
        return new NextResponse(
          JSON.stringify({ error: "User Twilio credentials not found" }),
          { status: 400 }
        );
      }
      twilioAccountSid = user.twilioAccountSid;
      twilioAuthToken = user.twilioAuthToken;
    } else if (trackingNumber.method === "Automatic") {
      // Use the system's Twilio credentials
      twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!;
      twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!;
    } else {
      return new NextResponse(
        JSON.stringify({ error: "Invalid tracking number method" }),
        { status: 400 }
      );
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
      (num) => num.phoneNumber !== phoneNumber
    );
    await user.save();

    return new NextResponse(
      JSON.stringify({ success: true, message: "Number removed" }),
      { status: 200 }
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
      return new NextResponse(
        JSON.stringify({
          error: `Twilio error: ${errorMessage} (Code: ${error.code})`,
        }),
        { status: 500 }
      );
    }

    // Handle generic errors
    return new NextResponse(
      JSON.stringify({ error: "Failed to remove number" }),
      { status: 500 }
    );
  }
}
