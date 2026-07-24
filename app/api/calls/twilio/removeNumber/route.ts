import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { env } from "@/lib/env";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

type TrackingNumberRecord = {
  phoneNumber?: string;
  method?: "Manual" | "Automatic" | string;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Get the session to fetch the current user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return unauthorized("Unauthorized. Please log in.");
    }

    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "twilio-remove-number",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

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

    const trackingNumbers =
      user.trackingNumbers as unknown as TrackingNumberRecord[];

    // Find the tracking number in the user's trackingNumbers array
    const trackingNumber = trackingNumbers.find(
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

    // Remove the number with an atomic $pull rather than re-saving the whole
    // document — a full-document save here would silently clobber any other
    // tracking-number edit (e.g. updateForwarding) that landed on the same
    // user document between our read above and this write.
    await User.updateOne(
      { _id: session.user.id },
      { $pull: { trackingNumbers: { phoneNumber } } },
    );

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
