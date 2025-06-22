// Description: This API route handles the reordering of tiers in bulk.
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// GET all tiers
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const tiers = await Tier.find().sort({ order: 1 }).lean();
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Error fetching tiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch tiers" },
      { status: 500 }
    );
  }
}

// Create new tier
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await dbConnect();

    // Validate required fields
    if (!data.name || !data.price || !data.description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Set default order if not provided
    if (!data.order) {
      const count = await Tier.countDocuments();
      data.order = count + 1;
    }

    // Set default tierLimits if not provided
    if (!data.tierLimits) {
      data.tierLimits = {
        leads: 0,
        twilioNumbers: 0,
        numbers: 0,
        callSeconds: 0,
        forms: 0,
        buyers: 0,
        exports: false,
        imports: false,
        liveSupport: false,
        industries: 0,
      };
    }

    // Create the tier
    const tier = await Tier.create(data);
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("Error creating tier:", error);
    return NextResponse.json(
      { error: "Failed to create tier" },
      { status: 500 }
    );
  }
}

// Update tier
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await dbConnect();

    // Get the existing tier first
    const existingTier = await Tier.findById(id);
    if (!existingTier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Check if price-related fields are being updated
    const priceChanged =
      updateData.price !== undefined && updateData.price !== existingTier.price;

    const discountedPriceChanged =
      updateData.discountedPrice !== undefined &&
      updateData.discountedPrice !== existingTier.discountedPrice;

    // Update the tier
    const updatedTier = await Tier.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTier);
  } catch (error) {
    console.error("Error updating tier:", error);
    return NextResponse.json(
      { error: "Failed to update tier" },
      { status: 500 }
    );
  }
}

// Bulk update tier order
// export async function PUT(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== "admin") {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { tiers: updatedTiers } = await req.json();
//     await dbConnect();

//     // Prepare bulk operations
//     const bulkOps = updatedTiers.map((tier: any) => ({
//       updateOne: {
//         filter: { _id: tier._id },
//         update: { $set: { order: tier.order } },
//       },
//     }));

//     // Execute bulk write
//     await Tier.bulkWrite(bulkOps);

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Error reordering tiers:", error);
//     return NextResponse.json(
//       { error: "Failed to reorder tiers" },
//       { status: 500 }
//     );
//   }
// }

// Delete tier
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }
    await dbConnect();

    const tierToDelete = await Tier.findById(id);
    if (!tierToDelete) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Delete the tier
    await Tier.findByIdAndDelete(id);

    // Update order of remaining tiers
    await Tier.updateMany(
      { order: { $gt: tierToDelete.order } },
      { $inc: { order: -1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tier:", error);
    return NextResponse.json(
      { error: "Failed to delete tier" },
      { status: 500 }
    );
  }
}
