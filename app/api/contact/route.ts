import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/contact
 * Public contact-form submission — sends an email to the support address.
 * No auth required.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message } = body;

    // --- basic validation ------------------------------------------------
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and message are required." },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }

    // --- send email ------------------------------------------------------
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD || process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "BRIXCOT Contact Form"}" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_FROM, // deliver to the support inbox
      replyTo: email,
      subject: subject
        ? `[Contact] ${subject}`
        : `[Contact] New message from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px">
          <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px">${email}</td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone}</td></tr>` : ""}
          ${subject ? `<tr><td style="padding:8px;font-weight:bold">Subject</td><td style="padding:8px">${subject}</td></tr>` : ""}
        </table>
        <h3 style="margin-top:24px">Message</h3>
        <p style="white-space:pre-wrap">${message}</p>
      `,
    });

    return NextResponse.json(
      { success: true, message: "Your message has been sent." },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Contact API]", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 },
    );
  }
}
