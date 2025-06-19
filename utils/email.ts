// Description: This code is responsible for sending email notifications to buyers when they are assigned a new lead. It uses the Nodemailer library to handle email sending and connects to a MongoDB database to retrieve buyer and seller information.
import nodemailer from "nodemailer";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { Buyer } from "@/models/leadbuyers";

export const sendEmailNotification = async (buyerId: any, lead: any) => {
  try {
    await dbConnect();

    const buyer = await Buyer.findOne({ _id: buyerId });
    const sellerId = buyer?.registeredWith;
    const seller = await User.findOne({ _id: sellerId });
    // Fetch email configuration from buyer schema or use system defaults
    const emailConfig = {
      host: seller?.emailSettings.smtpServer || process.env.EMAIL_SERVER!,
      port: seller?.emailSettings.port || parseInt(process.env.EMAIL_PORT!, 10),
      secure: true,
      auth: {
        user: seller?.emailSettings.smtpUser || process.env.EMAIL_FROM!,
        pass: seller?.emailSettings.smtpPassword || process.env.EMAIL_PASSWORD!,
      },
    };

    // Create a transporter
    const transporter = nodemailer.createTransport(emailConfig);

    // Email content
    const mailOptions = {
      from: seller?.businessName || process.env.EMAIL_FROM,
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
