import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { authOptions } from "@/auth";
import mongoose from "mongoose";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";
import nodemailer from "nodemailer";

// Email function for HTML emails
async function sendBuyerWelcomeEmail(
  buyerEmail: string,
  buyerName: string,
  buyerCompany: string,
  buyerPhone: string,
  sellerName: string,
  sellerCompany: string,
  signInUrl: string,
) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER!,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_FROM!,
      pass: process.env.EMAIL_PASSWORD!,
    },
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BRIXCOT</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1976d2, #1565c0); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Welcome to BRIXCOT! 🎉</h1>
    <p style="color: #e3f2fd; margin-top: 10px;">Your Lead Buyer Account is Ready</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e0e0e0;">
    <p>Hello <strong>${buyerName}</strong>,</p>
    
    <p>Great news! <strong>${sellerName}</strong> from <strong>${sellerCompany}</strong> has registered you as a lead buyer on BRIXCOT, our lead management platform.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
      <h3 style="margin-top: 0; color: #1976d2;">📋 Your Registration Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerName}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerCompany}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${buyerEmail}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Phone:</strong></td><td style="padding: 8px 0;">${buyerPhone}</td></tr>
      </table>
      <p style="font-size: 12px; color: #666; margin-top: 10px; margin-bottom: 0;">💡 You can update this information anytime from your dashboard.</p>
    </div>
    
    <h3 style="color: #1976d2;">🚀 How to Access Your Buyer Dashboard:</h3>
    
    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;"><strong>Click the Sign In button below</strong> to go to the login page</li>
      <li style="margin-bottom: 10px;"><strong>Sign in with Google</strong> using this email address (${buyerEmail})</li>
      <li style="margin-bottom: 10px;"><strong>Select "Buyer"</strong> on the role selection page</li>
      <li style="margin-bottom: 10px;"><strong>Access your dashboard</strong> and start purchasing leads!</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${signInUrl}" style="display: inline-block; background: #1976d2; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Sign In to Your Dashboard</a>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107; margin-top: 20px;">
      <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Make sure to select <strong>"Buyer"</strong> during role selection to access the buyer dashboard and lead marketplace.</p>
    </div>
    
    <h3 style="color: #1976d2; margin-top: 25px;">👤 Your Seller Contact:</h3>
    <p style="margin: 5px 0;"><strong>Name:</strong> ${sellerName}</p>
    <p style="margin: 5px 0;"><strong>Company:</strong> ${sellerCompany}</p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
    
    <p style="color: #666; font-size: 14px;">If you have any questions, please contact your seller directly or reach out to our support team.</p>
  </div>
  
  <div style="background: #1565c0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
    <p style="color: white; margin: 0; font-size: 14px;">© ${new Date().getFullYear()} BRIXCOT - Lead Management Platform</p>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: buyerEmail,
    subject: `Welcome to BRIXCOT - ${sellerCompany} has registered you as a Lead Buyer`,
    html: htmlContent,
    text: `Welcome to BRIXCOT!\n\nHello ${buyerName},\n\n${sellerName} from ${sellerCompany} has registered you as a lead buyer. Visit ${signInUrl} to sign in with Google, select "Buyer" role, and access your dashboard.\n\nYour Registration Details:\nName: ${buyerName}\nCompany: ${buyerCompany}\nEmail: ${buyerEmail}\nPhone: ${buyerPhone}\n\nYou can update this information from your dashboard.`,
  });
}

export async function GET(req: NextRequest) {
  await dbConnect();

  // Get the current user session
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "seller") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get("buyerId");

    if (buyerId) {
      // Fetch a single buyer by ID with all fields
      const buyer = await Buyer.findOne({
        _id: buyerId,
        registeredWith: session.user.id,
      });

      if (!buyer) {
        return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
      }

      return NextResponse.json(buyer, { status: 200 });
    }

    // Fetch all buyers with all fields
    const buyers = await Buyer.find({ registeredWith: session.user.id });
    return NextResponse.json(buyers, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch buyer(s)" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");

  // Allow public registration via sellerId parameter, or authenticated registration
  const session = await getServerSession(authOptions);
  const registrationSellerId = sellerId || session?.user?.id;

  if (!registrationSellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      name,
      company,
      email,
      phone,
      status = "new",
      leadPreferences = { location: "", industry: "" },
      preferredDistribution = "automatic",
      notificationPreferences = ["email"],
      workingHours = { start: "09:00", end: "17:00" },
      timezone = "America/New_York",
      maxLeadsPerDay = 5,
    } = await req.json();

    // Validate required fields
    if (!name || !company || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify seller exists when using public registration
    if (sellerId) {
      const seller = await User.findById(sellerId);
      if (!seller || seller.role !== "seller") {
        return NextResponse.json({ error: "Invalid seller" }, { status: 400 });
      }
    }

    // Check subscription limit for buyers (only for authenticated requests to prevent abuse)
    if (session?.user?.id) {
      const usageCheck = await checkAndIncrementUsage(
        session.user.id,
        "buyers",
        1,
      );
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: `Buyer limit reached (${usageCheck.currentUsage}/${usageCheck.limit}). Please upgrade your plan.`,
          },
          { status: 403 },
        );
      }
    }

    // Map leadPreferences.location array to preferredZones
    const preferredZones =
      Array.isArray(leadPreferences.location) &&
      leadPreferences.location.length > 0
        ? leadPreferences.location.map((city: string) => ({ city }))
        : [];

    // Create weeklySchedule from workingHours - apply to all weekdays
    const weeklySchedule = {
      Monday: {
        enabled: true,
        start: workingHours.start,
        end: workingHours.end,
      },
      Tuesday: {
        enabled: true,
        start: workingHours.start,
        end: workingHours.end,
      },
      Wednesday: {
        enabled: true,
        start: workingHours.start,
        end: workingHours.end,
      },
      Thursday: {
        enabled: true,
        start: workingHours.start,
        end: workingHours.end,
      },
      Friday: {
        enabled: true,
        start: workingHours.start,
        end: workingHours.end,
      },
      Saturday: { enabled: false, start: "09:00", end: "17:00" },
      Sunday: { enabled: false, start: "09:00", end: "17:00" },
    };

    const newBuyer = new Buyer({
      name,
      company,
      email,
      phone,
      status,
      leadPreferences,
      preferredDistribution,
      notificationPreferences,
      workingHours,
      timezone,
      maxLeadsPerDay,
      registeredWith: registrationSellerId,
      preferredZones,
      weeklySchedule,
    });

    await newBuyer.save();

    // Add buyer ID to the user's list
    await User.findByIdAndUpdate(registrationSellerId, {
      $push: { buyers: newBuyer._id },
    });

    // Send welcome email to buyer when registered by a seller (authenticated request)
    if (session?.user?.id) {
      try {
        const seller = await User.findById(session.user.id);
        const signInUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/sign-in`;

        await sendBuyerWelcomeEmail(
          email,
          name,
          company,
          phone,
          seller?.name || "Your Seller",
          seller?.businessName || "Lead Seller",
          signInUrl,
        );

        return NextResponse.json(
          { ...newBuyer.toObject(), emailSent: true },
          { status: 201 },
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Return success even if email fails - buyer was still created
        return NextResponse.json(
          { ...newBuyer.toObject(), emailSent: false },
          { status: 201 },
        );
      }
    }

    return NextResponse.json(newBuyer, { status: 201 });
  } catch (error) {
    console.error("Create Buyer Error:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to create buyer";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("validation")) {
        errorMessage = `Validation error: ${error.message}`;
        statusCode = 400;
      } else if (error.message.includes("duplicate")) {
        errorMessage = "A buyer with this email already exists";
        statusCode = 409;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        debug:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: statusCode },
    );
  }
}

export async function PUT(req: NextRequest) {
  await dbConnect();

  // Extract the buyer ID from the request URL
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Validate ID
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid buyer ID" }, { status: 400 });
  }

  // Check user authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Extract update data
    const body = await req.json();

    // Prepare update fields
    const updateFields = {
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      status: body.status,
      leadPreferences: {
        location: body.leadPreferences?.location,
        industry: body.leadPreferences?.industry,
      },
      preferredDistribution: body.preferredDistribution,
      notificationPreferences: body.notificationPreferences,
      workingHours: {
        start: body.workingHours?.start,
        end: body.workingHours?.end,
      },
      timezone: body.timezone,
      maxLeadsPerDay: body.maxLeadsPerDay,
      businessDescription: body.businessDescription,
      companyRegNo: body.companyRegNo,
      vatTaxRegNo: body.vatTaxRegNo,
      businessWebsite: body.businessWebsite,
      contactAddress: body.contactAddress,
    };

    // Check if user is either the buyer themselves or the seller who registered them
    const buyer = await Buyer.findById(id);
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    // Get the user's document to check their email
    const user = await User.findById(session.user.id);
    const isBuyerOwner = buyer.email === user?.email;
    const isSeller =
      session.user.role === "seller" &&
      buyer.registeredWith?.toString() === session.user.id;

    if (!isBuyerOwner && !isSeller) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - you can only update your own profile or buyers you registered",
        },
        { status: 403 },
      );
    }

    // Perform the update
    const updatedBuyer = await Buyer.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    return NextResponse.json(updatedBuyer, { status: 200 });
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update buyer" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const deletedBuyer = await Buyer.findOneAndDelete({
      _id: id,
      registeredWith: session.user.id,
    });

    if (!deletedBuyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    // Remove buyer from user's buyers list
    await User.findByIdAndUpdate(session.user.id, {
      $pull: { buyers: id },
    });

    return NextResponse.json(
      { message: "Buyer deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete buyer" },
      { status: 500 },
    );
  }
}
