// Description: This code is responsible for sending email notifications to buyers when they are assigned a new lead. It uses the Nodemailer library to handle email sending and connects to a MongoDB database to retrieve buyer and seller information.
import nodemailer from "nodemailer";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { env } from "@/lib/env";

export const sendEmailNotification = async (buyerId: any, lead: any) => {
  try {
    await dbConnect();

    const buyer = await Buyer.findOne({ _id: buyerId });
    const sellerId = buyer?.registeredWith;
    const seller = await User.findOne({ _id: sellerId });
    // Fetch email configuration from buyer schema or use system defaults
    const emailConfig = {
      host:
        seller?.emailSettings.smtpServer ||
        env.EMAIL_SERVER ||
        env.EMAIL_SERVER_HOST,
      port: seller?.emailSettings.port || env.EMAIL_PORT,
      secure: true,
      auth: {
        user:
          seller?.emailSettings.smtpUser ||
          env.EMAIL_SERVER_USER ||
          env.EMAIL_FROM,
        pass:
          seller?.emailSettings.smtpPassword ||
          env.EMAIL_SERVER_PASSWORD ||
          env.EMAIL_PASSWORD ||
          "",
      },
    };

    // Create a transporter
    const transporter = nodemailer.createTransport(emailConfig);

    // Email content
    const mailOptions = {
      from: seller?.businessName
        ? `${seller.businessName} <${env.EMAIL_FROM}>`
        : `${env.EMAIL_FROM_NAME || "Brixcot Support"} <${env.EMAIL_FROM}>`,
      to: buyer?.email,
      subject: "New Lead Assigned",
      text: `You have been assigned a new lead BRIXCOT. Please login to your account to view the details.`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    //(`Email sent to ${buyer?.name} about lead ${lead.name}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
