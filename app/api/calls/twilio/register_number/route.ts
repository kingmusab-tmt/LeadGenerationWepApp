import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";
import { env } from "@/lib/env";
import { resolveTwilioCountryCode, countryUsesAreaCode } from "@/lib/twilioCountry";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

// Initialize Twilio client with system credentials
const SYSTEM_TWILIO_ACCOUNT_SID = env.TWILIO_ACCOUNT_SID;
const SYSTEM_TWILIO_AUTH_TOKEN = env.TWILIO_AUTH_TOKEN;
const systemClient = twilio(
  SYSTEM_TWILIO_ACCOUNT_SID,
  SYSTEM_TWILIO_AUTH_TOKEN,
);

type TwilioLikeError = Error & {
  code?: number;
};

function isTwilioLikeError(error: unknown): error is TwilioLikeError {
  return error instanceof Error;
}

type TrackingNumberRecord = {
  phoneNumber?: string;
  purpose?: string;
  industry?: string;
  forwardingType?: string;
  method?: string;
  recordCall?: boolean;
  reconnectCaller?: boolean;
  passCallerId?: boolean;
  leadSource?: string;
  welcomeMessage?: string;
  callWhisper?: string;
  requireResponse?: boolean;
  forwardingNumbers?: unknown[];
  leadBuyers?: unknown[];
};

export async function POST(req: NextRequest) {
  try {
    const userSession = await getServerSession(authOptions);

    if (!userSession?.user?.id || !userSession.user?.role) {
      return unauthorized("Authentication required");
    }

    if (
      userSession.user.role !== "seller" &&
      userSession.user.role !== "admin"
    ) {
      return forbidden("Seller or admin access required");
    }

    const csrfError = requireCsrf(req, userSession.user.email);
    if (csrfError) return csrfError;

    // This purchases a real, billable Twilio number per call — keep the
    // ceiling low regardless of the subscription-limit check.
    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "twilio-register-number",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      actorId: userSession.user.id,
    });
    if (rateLimited) return rateLimited;

    await dbConnect();

    const {
      sellerId,
      areaCode,
      industry: rawIndustry,
      method,
      twilioNumber,
      purpose,
    } = await req.json();

    // Normalize free-text industry (the "Other, specify below" UI path sends
    // arbitrary text) so stray whitespace/casing/length doesn't fragment the
    // Analytics and Buyer Performance groupings, which group calls by exact
    // string match on this field.
    const industry =
      typeof rawIndustry === "string" ? rawIndustry.trim().slice(0, 100) : "";

    // Only admins may target another seller via sellerId
    const userId =
      userSession.user.role === "admin" && sellerId
        ? sellerId
        : userSession.user.id;
    if (
      userSession.user.role !== "admin" &&
      sellerId &&
      String(sellerId) !== String(userSession.user.id)
    ) {
      return forbidden("You can only register numbers for your own account");
    }

    // Validate required fields
    if (!industry || !method) {
      return badRequest("industry and method are required");
    }

    // For SMS, areaCode is optional - we'll use a default if not provided
    const finalAreaCode = areaCode || "212"; // Default to NYC area code

    // Check if the seller exists and populate subscription
    const user = await User.findById(userId).select(
      "+subscription +trackingNumbers",
    );
    if (!user) {
      return notFound("Seller");
    }

    // Search Twilio numbers in the seller's own country instead of always
    // assuming US — UK/Canada sellers can now provision a local number.
    const twilioCountryCode = resolveTwilioCountryCode(
      user.businessAddress?.country,
    );
    const useAreaCode = countryUsesAreaCode(twilioCountryCode);

    // Check subscription limits
    const subscription = user.subscription;
    if (!subscription || !subscription.isSubscriptionActive) {
      return forbidden(
        "No active subscription found. Please subscribe to a plan first.",
      );
    }

    const trackingNumbers: TrackingNumberRecord[] = Array.isArray(
      user.trackingNumbers,
    )
      ? (user.trackingNumbers as unknown as TrackingNumberRecord[])
      : [];

    const currentTwilioNumbers = trackingNumbers.length;
    const maxAllowed = subscription.subscriptionLimits?.twilioNumbers || 0;

    if (currentTwilioNumbers >= maxAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You've reached your Twilio number limit.",
          limitReached: true,
          currentCount: currentTwilioNumbers,
          maxAllowed: maxAllowed,
          message: `Your current plan allows for ${maxAllowed} Twilio numbers. Please upgrade your subscription to add more numbers.`,
        },
        { status: 403 },
      );
    }

    let purchasedNumber: string;
    // Track which client + SID actually purchased a number (not set for the
    // "Manual + already-owned twilioNumber" branch, which purchases nothing)
    // so a lost race against the limit check below can release the number
    // instead of leaving the seller billed for one they can't use.
    let purchasingClient: ReturnType<typeof twilio> | undefined;
    let purchasedSid: string | undefined;

    if (method === "Manual") {
      if (twilioNumber) {
        purchasedNumber = twilioNumber;
      } else if (finalAreaCode) {
        if (!user.twilioAccountSid || !user.twilioAuthToken) {
          return badRequest(
            "Twilio credentials not found. Please set them in settings.",
          );
        }

        const userClient = twilio(user.twilioAccountSid, user.twilioAuthToken);
        const numbers = await userClient
          .availablePhoneNumbers(twilioCountryCode)
          .local.list({
            ...(useAreaCode && { areaCode: finalAreaCode }),
            limit: 1,
            smsEnabled: true,
            voiceEnabled: true,
          });

        if (numbers.length === 0) {
          return notFound(
            "No available phone numbers for the provided area code",
          );
        }

        const purchased = await userClient.incomingPhoneNumbers.create({
          phoneNumber: numbers[0].phoneNumber,
          friendlyName: `Seller ${userId} - ${industry}`,
          voiceUrl: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/calls?sellerId=${userId}`,
          voiceMethod: "POST",
          voiceFallbackUrl: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/fallback?sellerId=${userId}`,
          voiceFallbackMethod: "POST",
          statusCallback: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/savecallrecord`,
          statusCallbackMethod: "POST",
        });
        purchasedNumber = purchased.phoneNumber;
        purchasingClient = userClient;
        purchasedSid = purchased.sid;
      } else {
        return badRequest(
          "Either areaCode or twilioNumber must be provided for Manual method.",
        );
      }
    } else if (method === "Automatic") {
      if (finalAreaCode && !/^\d{3}$/.test(finalAreaCode)) {
        return badRequest("Invalid area code. It must be a 3-digit number.");
      }

      // For SMS, always use system credentials
      if (purpose === "sms") {
        if (!SYSTEM_TWILIO_ACCOUNT_SID || !SYSTEM_TWILIO_AUTH_TOKEN) {
          return internalError(
            "System Twilio credentials not configured. Please contact administrator to set up TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
          );
        }

        const numbers = await systemClient
          .availablePhoneNumbers(twilioCountryCode)
          .local.list({
            ...(useAreaCode && { areaCode: finalAreaCode }),
            limit: 1,
            smsEnabled: true,
            voiceEnabled: true,
          });

        if (numbers.length === 0) {
          return notFound(
            "No available phone numbers for the provided area code",
          );
        }

        const purchased = await systemClient.incomingPhoneNumbers.create({
          phoneNumber: numbers[0].phoneNumber,
          friendlyName: `SMS - ${userId}`,
          smsUrl: `https://${env.NEXT_PUBLIC_DOMAIN}/api/marketing/sms/inbound`,
          smsMethod: "POST",
        });
        purchasedNumber = purchased.phoneNumber;
        purchasingClient = systemClient;
        purchasedSid = purchased.sid;
      } else {
        // For call tracking, use user credentials if available
        let clientToUse = systemClient;
        if (user.twilioAccountSid && user.twilioAuthToken) {
          clientToUse = twilio(user.twilioAccountSid, user.twilioAuthToken);
        }

        const numbers = await clientToUse
          .availablePhoneNumbers(twilioCountryCode)
          .local.list({
            ...(useAreaCode && { areaCode: finalAreaCode }),
            limit: 1,
            smsEnabled: true,
            voiceEnabled: true,
          });

        if (numbers.length === 0) {
          return notFound(
            "No available phone numbers for the provided area code",
          );
        }

        const purchased = await clientToUse.incomingPhoneNumbers.create({
          phoneNumber: numbers[0].phoneNumber,
          friendlyName: `Seller ${userId} - ${industry}`,
          voiceUrl: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/calls?sellerId=${userId}`,
          voiceMethod: "POST",
          voiceFallbackUrl: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/fallback?sellerId=${userId}`,
          voiceFallbackMethod: "POST",
          statusCallback: `https://${env.NEXT_PUBLIC_DOMAIN}/api/calls/twilio/savecallrecord`,
          statusCallbackMethod: "POST",
        });
        purchasedNumber = purchased.phoneNumber;
        purchasingClient = clientToUse;
        purchasedSid = purchased.sid;
      }
    } else {
      return badRequest("Invalid method. Must be 'Manual' or 'Automatic'.");
    }

    // Atomically add the number only if the seller is still under their
    // limit at write time. The initial check above can be stale by the time
    // the Twilio purchase call above completes, so re-verify the count as
    // part of the write itself (findOneAndUpdate with $expr) rather than
    // trusting the earlier read — this closes the race where two concurrent
    // requests both pass the early check and both push a number.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$trackingNumbers", []] } },
            maxAllowed,
          ],
        },
      },
      {
        $push: {
          trackingNumbers: {
            phoneNumber: purchasedNumber,
            purpose: purpose || "call",
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
          },
        },
      },
      { new: true },
    ).select("trackingNumbers");

    if (!updatedUser) {
      // Lost the race — release the number we just purchased so the seller
      // isn't billed for a Twilio number they can't use.
      if (purchasingClient && purchasedSid) {
        try {
          await purchasingClient.incomingPhoneNumbers(purchasedSid).remove();
        } catch (releaseError) {
          console.error(
            "Failed to release unused Twilio number after limit race:",
            releaseError,
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "You've reached your Twilio number limit.",
          limitReached: true,
          currentCount: maxAllowed,
          maxAllowed,
          message: `Your current plan allows for ${maxAllowed} Twilio numbers. Please upgrade your subscription to add more numbers.`,
        },
        { status: 403 },
      );
    }

    const newCount = Array.isArray(updatedUser.trackingNumbers)
      ? updatedUser.trackingNumbers.length
      : currentTwilioNumbers + 1;

    return NextResponse.json(
      {
        success: true,
        data: {
          phoneNumber: purchasedNumber,
          currentCount: newCount,
          maxAllowed: maxAllowed,
          message: `You've used ${newCount} of ${maxAllowed} allowed Twilio numbers.`,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/call_twilio/register_number:", error);

    if (isTwilioLikeError(error) && error.code !== undefined) {
      let errorMessage = error.message;
      if (error.code === 21211) {
        errorMessage =
          "Invalid area code. Please provide a valid 3-digit area code.";
      } else if (error.code === 20003) {
        errorMessage =
          "Twilio authentication failed. Please check your credentials.";
      }
      return NextResponse.json(
        {
          success: false,
          error: `Twilio error: ${errorMessage} (Code: ${error.code})`,
        },
        { status: 500 },
      );
    }

    return internalError(
      "An unexpected error occurred. Please try again later.",
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
