import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";

// GET - Fetch buyer's service locations
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      serviceLocations: buyer.serviceLocations || [],
      locationMatchingStrict: buyer.locationMatchingStrict || false,
    });
  } catch (error) {
    console.error("Error fetching service locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch service locations" },
      { status: 500 }
    );
  }
}

// POST - Add a new service location
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { city, state, country, zipCodes, radius } = body;

    if (!city || !state) {
      return NextResponse.json(
        { error: "City and state are required" },
        { status: 400 }
      );
    }

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: "Failed to add service location" },
      { status: 500 }
    );
  }
}

// PUT - Update service locations settings
export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { serviceLocations, locationMatchingStrict } = body;

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: "Failed to update service locations" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a service location
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const index = searchParams.get("index");

    if (index === null) {
      return NextResponse.json(
        { error: "Location index is required" },
        { status: 400 }
      );
    }

    const buyer = await Buyer.findOne({ email: session.user.email });
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    // Remove location at specified index
    const locationIndex = parseInt(index);
    if (locationIndex < 0 || locationIndex >= buyer.serviceLocations.length) {
      return NextResponse.json(
        { error: "Invalid location index" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Failed to remove service location" },
      { status: 500 }
    );
  }
}
