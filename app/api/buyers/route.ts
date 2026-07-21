import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { authOptions } from "@/auth";
import mongoose from "mongoose";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";
import { sendBuyerEmail } from "@/lib/buyerEmail";
import {
  badRequest,
  conflict,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  await dbConnect();

  // Get the current user session
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user?.role !== "seller" && session.user?.role !== "business-admin")
  ) {
    return unauthorized("Authentication required");
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
        return notFound("Buyer");
      }

      return NextResponse.json({ success: true, data: buyer }, { status: 200 });
    }

    // Fetch all buyers with lean() for faster serialization
    const buyers = await Buyer.find({ registeredWith: session.user.id }).lean();
    return NextResponse.json({ success: true, data: buyers }, { status: 200 });
  } catch {
    return internalError("Failed to fetch buyer(s)");
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");

  // Require authenticated registration
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user?.role) {
    return unauthorized("Authentication required");
  }

  if (session.user.role !== "seller" && session.user.role !== "admin") {
    return forbidden("Forbidden");
  }

  const registrationSellerId =
    session.user.role === "admin" && sellerId ? sellerId : session.user.id;

  if (
    session.user.role !== "admin" &&
    sellerId &&
    String(sellerId) !== String(session.user.id)
  ) {
    return forbidden("Forbidden");
  }

  try {
    const {
      name,
      company,
      email,
      phone,
      status = "new",
      leadPreferences = { location: [], industries: [] },
      preferredDistribution = "automatic",
      notificationPreferences = ["email"],
      workingHours = { start: "09:00", end: "17:00" },
      timezone = "America/New_York",
      maxLeadsPerDay = 5,
    } = await req.json();

    // Validate required fields
    if (!name || !company || !email || !phone) {
      return badRequest("Missing required fields");
    }

    // Verify seller exists
    if (registrationSellerId) {
      const seller = await User.findById(registrationSellerId);
      if (!seller || seller.role !== "seller") {
        return badRequest("Invalid seller");
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
        return forbidden(
          `Buyer limit reached (${usageCheck.currentUsage}/${usageCheck.limit}). Please upgrade your plan.`,
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

        await sendBuyerEmail({
          variant: "welcome",
          buyerEmail: email,
          buyerName: name,
          buyerCompany: company,
          buyerPhone: phone,
          sellerName: seller?.name || "Your Seller",
          sellerCompany: seller?.businessName || "Lead Seller",
          signInUrl,
        });

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

    if (error instanceof Error) {
      if (error.message.includes("validation")) {
        return badRequest(`Validation error: ${error.message}`);
      } else if (error.message.includes("duplicate")) {
        return conflict("A buyer with this email already exists");
      }
    }

    return internalError(
      error instanceof Error ? error.message : "Failed to create buyer",
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
    return badRequest("Invalid buyer ID");
  }

  // Check user authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
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
        location: Array.isArray(body.leadPreferences?.location)
          ? body.leadPreferences.location
          : body.leadPreferences?.location
            ? [body.leadPreferences.location]
            : [],
        industries: Array.isArray(body.leadPreferences?.industries)
          ? body.leadPreferences.industries
          : body.leadPreferences?.industry
            ? [body.leadPreferences.industry]
            : [],
        industryServicePairs: body.leadPreferences?.industryServicePairs || [],
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
      return notFound("Buyer");
    }

    // Get the user's document to check their email
    const user = await User.findById(session.user.id);
    const isBuyerOwner = buyer.email === user?.email;
    const isSeller =
      session.user.role === "seller" &&
      buyer.registeredWith?.toString() === session.user.id;

    if (!isBuyerOwner && !isSeller) {
      return forbidden(
        "Unauthorized - you can only update your own profile or buyers you registered",
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
    return internalError("Failed to update buyer");
  }
}

export async function DELETE(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const deletedBuyer = await Buyer.findOneAndDelete({
      _id: id,
      registeredWith: session.user.id,
    });

    if (!deletedBuyer) {
      return notFound("Buyer");
    }

    // Remove buyer from user's buyers list
    await User.findByIdAndUpdate(session.user.id, {
      $pull: { buyers: id },
    });

    return NextResponse.json(
      { success: true, data: { message: "Buyer deleted successfully" } },
      { status: 200 },
    );
  } catch {
    return internalError("Failed to delete buyer");
  }
}
