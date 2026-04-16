import { NextRequest, NextResponse } from "next/server";
import { smsMarketingEngine } from "@/lib/smsMarketingEngine";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import twilio from "twilio";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const securityResponse = await callSecurityMiddleware(req, {
    rateLimit: true,
    validateWebhook: true,
  });
  if (securityResponse) return securityResponse;

  await dbConnect();
  const formData = await req.formData();
  const from = (formData.get("From") as string) || "";
  const to = (formData.get("To") as string) || "";
  const body = (formData.get("Body") as string) || "";

  // Find the seller by Twilio default number or assigned tracking number
  const seller = await User.findOne({
    $or: [
      { "apiSettings.twilioPhoneNumber": to },
      { "trackingNumbers.phoneNumber": to },
    ],
  });
  if (!seller) {
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(
      "Sorry, this messaging number is not configured for inbound replies.",
    );
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const userId = String(seller._id);

  const { reply } = await smsMarketingEngine.handleInboundMessage(
    userId,
    from,
    to,
    body,
  );

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
