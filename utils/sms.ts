// Twilio SMS Notification Utility
// Description: This utility function sends an SMS notification to a lead buyer when a new lead is assigned to them. It uses the Twilio API for sending SMS messages.
import twilio from "twilio";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models/user";

export const sendSmsNotification = async (buyer: any, lead: any) => {
  try {
    const leadbuyer = await Buyer.findById(buyer);
    // Fetch seller details
    const seller = await User.findById(leadbuyer?.registeredWith);
    // Fetch Twilio configuration from buyer schema or use system defaults
    const accountSid =
      seller?.apiSettings.twilioSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken =
      seller?.apiSettings.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber =
      seller?.apiSettings.twilioPhoneNumber || process.env.TWILIO_FROM_NUMBER;

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Send SMS
    await client.messages.create({
      body: `You have been assigned a new lead: ${lead.name}`,
      from: fromNumber,
      to: leadbuyer?.phone || buyer.phone,
    });

    console.log(`SMS sent to ${buyer.name} about lead ${lead.name}`);
  } catch (error) {
    console.error("Error sending SMS:", error);
  }
};
