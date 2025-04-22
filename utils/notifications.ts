import nodemailer from "nodemailer";
import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  EMAIL_FROM,
  EMAIL_SERVER,
  EMAIL_PASSWORD,
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Email Transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_SERVER!,
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: EMAIL_FROM!,
    pass: EMAIL_PASSWORD!,
  },
});

// Send Email Notification
export async function sendEmail(to: string, subject: string, text: string) {
  await transporter.sendMail({ from: EMAIL_FROM, to, subject, text });
}

// Send SMS Notification
export async function sendSMS(to: string, text: string) {
  await client.messages.create({ from: TWILIO_PHONE_NUMBER, to, body: text });
}
