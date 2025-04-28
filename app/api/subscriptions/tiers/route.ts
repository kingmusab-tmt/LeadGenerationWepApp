// app/api/tiers/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import { ObjectId } from "mongodb"; // Import ObjectId for proper ID handling
import { Tier } from "@/models/tier";

export async function GET(req: NextRequest) {
  try {
    // Get tierId from query parameters
    const { searchParams } = new URL(req.url);
    const tierId = searchParams.get("tierId");

    if (!tierId) {
      return NextResponse.json(
        { error: "Tier ID is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Validate and convert to ObjectId
    let objectId;
    try {
      objectId = new ObjectId(tierId);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid Tier ID format" },
        { status: 400 }
      );
    }

    // Find the tier in database using the model
    const tier = await Tier.findOne({
      _id: objectId,
      isActive: true,
    }).lean(); // Use lean() for better performance

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found or not available" },
        { status: 404 }
      );
    }

    // Return the tier data with proper typing
    const responseData = {
      _id: tier._id.toString(), // Convert ObjectId to string
      name: tier.name,
      price: tier.price,
      description: tier.description,
      features: tier.features,
      ctaText: tier.ctaText,
      highlight: tier.highlight,
      isActive: tier.isActive,
      tierType: tier.tierType,
      tierUserType: tier.tierUserType,
      discountPercentage: tier.discountPercentage,
      discountedPrice: tier.discountedPrice,
      renewalPrice: tier.renewalPrice,
      annualPrice: tier.annualPrice,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching tier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
