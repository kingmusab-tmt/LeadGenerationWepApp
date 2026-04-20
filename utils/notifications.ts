// Description: Utility functions to send notifications via email and SMS using Twilio and Nodemailer.
import nodemailer from "nodemailer";
import twilio from "twilio";
import { env } from "@/lib/env";

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

function getTwilioFromNumber() {
  const from = env.TWILIO_FROM_NUMBER || env.TWILIO_PHONE_NUMBER;
  if (!from || !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio notification configuration is incomplete");
  }
  return from;
}

function getEmailTransporter() {
  const host = env.EMAIL_SERVER || env.EMAIL_SERVER_HOST;
  const user = env.EMAIL_SERVER_USER || env.EMAIL_FROM;
  const password = env.EMAIL_SERVER_PASSWORD || env.EMAIL_PASSWORD;

  if (!host || !user || !password) {
    throw new Error("Email notification configuration is incomplete");
  }

  return nodemailer.createTransport({
    host,
    port: env.EMAIL_PORT,
    secure: true,
    auth: {
      user,
      pass: password,
    },
  });
}

// Send Email Notification
export async function sendEmail(to: string, subject: string, text: string) {
  await getEmailTransporter().sendMail({
    from: `${env.EMAIL_FROM_NAME || "Brixcot Support"} <${env.EMAIL_FROM}>`,
    to,
    subject,
    text,
  });
}

// Send SMS Notification
export async function sendSMS(to: string, text: string) {
  await client.messages.create({
    from: getTwilioFromNumber(),
    to,
    body: text,
  });
}
