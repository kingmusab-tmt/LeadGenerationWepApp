import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { authOptions } from "@/auth";
import mongoose from "mongoose";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";

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

  const session = await getServerSession(authOptions);
  if (!session) {
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

    // Check subscription limit for buyers
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
      registeredWith: session.user.id,
    });

    await newBuyer.save();

    // Add buyer ID to the user's list
    await User.findByIdAndUpdate(session.user.id, {
      $push: { buyers: newBuyer._id },
    });

    return NextResponse.json(newBuyer, { status: 201 });
  } catch (error) {
    console.error("Create Buyer Error:", error);
    return NextResponse.json(
      { error: "Failed to create buyer" },
      { status: 500 },
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
