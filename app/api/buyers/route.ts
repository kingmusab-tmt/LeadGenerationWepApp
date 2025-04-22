import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models/user";
import { authOptions } from "@/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await dbConnect();

  // Get the current user session
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get("buyerId"); // ✅ Get buyerId from query params

    if (buyerId) {
      // ✅ Fetch a single buyer by ID
      const buyer = await Buyer.findOne({
        _id: buyerId,
        registeredWith: session.user.id,
      });

      if (!buyer) {
        return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
      }

      return NextResponse.json(buyer, { status: 200 });
    }

    // ✅ If no buyerId is provided, fetch all buyers
    const buyers = await Buyer.find({ registeredWith: session.user.id });
    return NextResponse.json(buyers, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch buyer(s)" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("sellerId");

  const session = await getServerSession(authOptions);
  if (!session && !userId) {
    return NextResponse.json({ error: "User Id is required" }, { status: 401 });
  }

  try {
    const {
      name,
      company,
      email,
      phone,
      status,
      leadPreferences,
      preferredDistribution,
      notificationPreferences,
    } = await req.json();

    const assignedUserId = userId || session?.user.id; // Use URL param if available, else fallback to session

    const newBuyer = new Buyer({
      name,
      company,
      email,
      phone,
      status,
      leadPreferences,
      preferredDistribution, // Add preferredDistribution
      notificationPreferences, // Add notificationPreference
      registeredWith: assignedUserId, // Associate buyer with the resolved user ID
    });

    await newBuyer.save();

    // Add buyer ID to the resolved user's list
    await User.findByIdAndUpdate(assignedUserId, {
      $push: { buyers: newBuyer._id },
    });

    return NextResponse.json(newBuyer, { status: 201 });
  } catch (error) {
    console.error("Create Buyer Error:", error);
    return NextResponse.json(
      { error: "Failed to create buyer" },
      { status: 500 }
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
    // Extract and sanitize update data
    const body = await req.json();
    const updateFields = {
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      status: body.status,
      leadPreferences: {
        location: body.leadPreferences?.location,
        industry: body.leadPreferences?.industry,
        budget: body.leadPreferences?.budget,
      },
      preferredDistribution: body.preferredDistribution, // Add preferredDistribution
      notificationPreferences: body.notificationPreferences, // Add notificationPreference
    };

    // Perform the update in the database
    const updatedBuyer = await Buyer.findOneAndUpdate(
      { _id: id, registeredWith: session.user.id }, // Ensure user is authorized
      { $set: updateFields }, // Use $set to update specific fields
      { new: true, runValidators: true } // Return updated document & enforce validation
    );

    if (!updatedBuyer) {
      return NextResponse.json(
        { error: "Buyer not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedBuyer, { status: 200 });
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update buyer" },
      { status: 500 }
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
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete buyer" },
      { status: 500 }
    );
  }
}
