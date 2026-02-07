import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Parse the request body with new fields
    const {
      sellerId,
      phoneNumber,
      industry,
      forwardingType,
      method,
      recordCall,
      reconnectCaller,
      passCallerId,
      leadSource,
      welcomeMessage,
      callWhisper,
      requireResponse,
      buyerResponses,
      leadResponses,
      forwardingNumbers,
      leadBuyers,
      overflowNumber,
      // Seller working hours
      enableWorkingHours,
      workingHoursStart,
      workingHoursEnd,
      // New feature flags
      recordingConsent,
      recordingConsentMessage,
      missedCallTextBack,
      missedCallTextMessage,
      dncEnabled,
      dncList,
      spamFilterEnabled,
      spamFilterAction,
      scheduledCallbackEnabled,
      scheduledCallbackDigit,
      multiRingEnabled,
      geoRoutingEnabled,
      concurrentCallLimit,
      transcriptionEnabled,
      aiSummaryEnabled,
    } = await req.json();

    // Find the seller
    const seller = await User.findById(sellerId);
    if (!seller) {
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });
    }

    // Find the tracking number
    const number = seller.trackingNumbers.find(
      (num: any) => num.phoneNumber === phoneNumber,
    );
    if (!number) {
      return new NextResponse(JSON.stringify({ error: "Number not found" }), {
        status: 404,
      });
    }

    // Update the tracking number fields
    number.industry = industry || number.industry;
    number.forwardingType = forwardingType;
    number.method = method || number.method;
    number.recordCall = recordCall || false;
    number.reconnectCaller = reconnectCaller || false;
    number.passCallerId = passCallerId || false;
    number.leadSource = leadSource || "";
    number.welcomeMessage = welcomeMessage || "";
    number.callWhisper = callWhisper || "";
    number.requireResponse = requireResponse || false;
    number.overflowNumber = overflowNumber || "";

    // Save working hours
    number.enableWorkingHours = !!enableWorkingHours;
    number.workingHoursStart = workingHoursStart || "09:00";
    number.workingHoursEnd = workingHoursEnd || "17:00";

    // Update new feature flags
    number.recordingConsent = !!recordingConsent;
    number.recordingConsentMessage =
      recordingConsentMessage ||
      "This call may be recorded for quality assurance purposes.";
    number.missedCallTextBack = !!missedCallTextBack;
    number.missedCallTextMessage =
      missedCallTextMessage ||
      "We missed your call! We will get back to you shortly.";
    number.dncEnabled = !!dncEnabled;
    if (dncList && Array.isArray(dncList)) {
      number.dncList = dncList
        .filter((n: string) => n && n.trim())
        .map((n: string) => n.trim());
    }
    number.spamFilterEnabled = !!spamFilterEnabled;
    number.spamFilterAction = spamFilterAction === "warn" ? "warn" : "block";
    number.scheduledCallbackEnabled = !!scheduledCallbackEnabled;
    number.scheduledCallbackDigit = scheduledCallbackDigit || "1";
    number.multiRingEnabled = !!multiRingEnabled;
    number.geoRoutingEnabled = !!geoRoutingEnabled;
    number.concurrentCallLimit =
      typeof concurrentCallLimit === "number" ? concurrentCallLimit : 0;
    number.transcriptionEnabled = !!transcriptionEnabled;
    number.aiSummaryEnabled = !!aiSummaryEnabled;

    // Handle response verification settings
    if (requireResponse) {
      // Validate and set buyer responses
      if (buyerResponses && Array.isArray(buyerResponses)) {
        number.buyerResponses = buyerResponses
          .filter((res: any) => res.message && res.digit)
          .map((res: any) => ({
            message: res.message.trim(),
            digit: res.digit.trim(),
          }));
      } else {
        number.buyerResponses = undefined;
      }

      // Validate and set lead responses
      if (leadResponses && Array.isArray(leadResponses)) {
        number.leadResponses = leadResponses
          .filter((res: any) => res.message && res.digit)
          .map((res: any) => ({
            message: res.message.trim(),
            digit: res.digit.trim(),
          }));
      } else {
        number.leadResponses = undefined;
      }
    } else {
      // Clear responses if verification is disabled
      number.buyerResponses = undefined;
      number.leadResponses = undefined;
    }

    // Update forwarding numbers (if applicable)
    if (forwardingType === "single_multiple" && forwardingNumbers) {
      number.forwardingNumbers = forwardingNumbers
        .filter((num: string) => num.trim())
        .map((num: string) => num.trim());
    } else {
      number.forwardingNumbers = undefined;
    }

    // Update lead buyers (if applicable)
    if (forwardingType === "specific_lead" && leadBuyers) {
      number.leadBuyers = leadBuyers
        .filter((buyer: any) => buyer.id && buyer.name)
        .map((buyer: any) => ({
          id: buyer.id,
          name: buyer.name,
          phone: buyer.phone || "", // Include phone if available
        }));
    } else {
      number.leadBuyers = undefined;
    }

    // Save the updated seller document
    await seller.save();

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Forwarding settings updated successfully",
        data: {
          phoneNumber,
          requireResponse,
          hasBuyerResponses: (number.buyerResponses ?? []).length > 0,
          hasLeadResponses: (number.leadResponses ?? []).length > 0,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating forwarding:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to update forwarding",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
}
