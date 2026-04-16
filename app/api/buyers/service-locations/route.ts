import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

// GET - Fetch buyer's service locations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    if (session.user.role !== "buyer" && session.user.role !== "admin") {
      return forbidden("Buyer or admin access required");
    }

    await dbConnect();

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return notFound("Buyer");
    }

    return NextResponse.json({
      success: true,
      serviceLocations: buyer.serviceLocations || [],
      locationMatchingStrict: buyer.locationMatchingStrict || false,
    });
  } catch (error) {
    console.error("Error fetching service locations:", error);
    return internalError("Failed to fetch service locations");
  }
}

// POST - Add a new service location
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    if (session.user.role !== "buyer" && session.user.role !== "admin") {
      return forbidden("Buyer or admin access required");
    }

    await dbConnect();

    const body = await req.json();
    const { city, state, country, zipCodes, radius } = body;

    if (!city || !state) {
      return badRequest("City and state are required");
    }

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return notFound("Buyer");
    }

    // Add new service location
    const newLocation = {
      city,
      state,
      country: country || "USA",
      zipCodes: zipCodes || [],
      radius: radius || 25,
    };

    buyer.serviceLocations = buyer.serviceLocations || [];
    buyer.serviceLocations.push(newLocation);
    await buyer.save();

    return NextResponse.json({
      success: true,
      message: "Service location added successfully",
      serviceLocations: buyer.serviceLocations,
    });
  } catch (error) {
    console.error("Error adding service location:", error);
    return internalError("Failed to add service location");
  }
}

// PUT - Update service locations settings
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    if (session.user.role !== "buyer" && session.user.role !== "admin") {
      return forbidden("Buyer or admin access required");
    }

    await dbConnect();

    const body = await req.json();
    const { serviceLocations, locationMatchingStrict } = body;

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return notFound("Buyer");
    }

    // Update service locations
    if (serviceLocations !== undefined) {
      buyer.serviceLocations = serviceLocations;
    }

    // Update strict matching preference
    if (locationMatchingStrict !== undefined) {
      buyer.locationMatchingStrict = locationMatchingStrict;
    }

    await buyer.save();

    return NextResponse.json({
      success: true,
      message: "Service locations updated successfully",
      serviceLocations: buyer.serviceLocations,
      locationMatchingStrict: buyer.locationMatchingStrict,
    });
  } catch (error) {
    console.error("Error updating service locations:", error);
    return internalError("Failed to update service locations");
  }
}

// DELETE - Remove a service location
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    if (session.user.role !== "buyer" && session.user.role !== "admin") {
      return forbidden("Buyer or admin access required");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const index = searchParams.get("index");

    if (index === null) {
      return badRequest("Location index is required");
    }

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return notFound("Buyer");
    }

    // Remove location at specified index
    const locationIndex = parseInt(index, 10);
    if (locationIndex < 0 || locationIndex >= buyer.serviceLocations.length) {
      return badRequest("Invalid location index");
    }

    buyer.serviceLocations.splice(locationIndex, 1);
    await buyer.save();

    return NextResponse.json({
      success: true,
      message: "Service location removed successfully",
      serviceLocations: buyer.serviceLocations,
    });
  } catch (error) {
    console.error("Error removing service location:", error);
    return internalError("Failed to remove service location");
  }
}
