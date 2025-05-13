// import { NextRequest, NextResponse } from "next/server";
// import dbConnect from "@/lib/connectdb";
// import { Tier } from "@/models/tier";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/auth";

// // GET all tiers
// export async function GET(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== "admin") {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     await dbConnect();
//     const tiers = await Tier.find().sort({ order: 1 }).lean();
//     return NextResponse.json(tiers);
//   } catch (error) {
//     console.error("Error fetching tiers:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch tiers" },
//       { status: 500 }
//     );
//   }
// }

// // Create new tier
// export async function POST(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== "admin") {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const data = await req.json();
//     await dbConnect();

//     // Set default order if not provided
//     if (!data.order) {
//       const count = await Tier.countDocuments();
//       data.order = count + 1;
//     }

//     // Validate required fields
//     if (!data.name || !data.price || !data.description) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     const tier = await Tier.create(data);
//     return NextResponse.json(tier, { status: 201 });
//   } catch (error) {
//     console.error("Error creating tier:", error);
//     return NextResponse.json(
//       { error: "Failed to create tier" },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== "admin") {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const updateData = await req.json();
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");

//     if (!id) {
//       return NextResponse.json({ error: "Missing ID" }, { status: 400 });
//     }

//     await dbConnect();
//     console.log("DB connected");
//     console.log("ID:", id);
//     console.log("updateData:", updateData);

//     const updatedTier = await Tier.findByIdAndUpdate(id, updateData, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updatedTier) {
//       return NextResponse.json({ error: "Tier not found" }, { status: 404 });
//     }

//     return NextResponse.json(updatedTier);
//   } catch (error) {
//     console.error("Error updating tier:", error);
//     return NextResponse.json(
//       { error: "Failed to update tier" },
//       { status: 500 }
//     );
//   }
// }

// // Individual tier operations (PUT/DELETE)
// export async function PATCH(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== "admin") {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const updateData = await req.json();
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");

//     if (!id) {
//       return NextResponse.json({ error: "Missing ID" }, { status: 400 });
//     }
//     await dbConnect();

//     const updatedTier = await Tier.findByIdAndUpdate(id, updateData, {
//       new: true,
//     });

//     if (!updatedTier) {
//       return NextResponse.json({ error: "Tier not found" }, { status: 404 });
//     }

//     return NextResponse.json(updatedTier);
//   } catch (error) {
//     console.error("Error updating tier:", error);
//     return NextResponse.json(
//       { error: "Failed to update tier" },
//       { status: 500 }
//     );
//   }
// }

// // Delete tier
// export async function DELETE(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== "admin") {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");

//     if (!id) {
//       return NextResponse.json({ error: "Missing ID" }, { status: 400 });
//     }
//     await dbConnect();

//     const tierToDelete = await Tier.findById(id);
//     if (!tierToDelete) {
//       return NextResponse.json({ error: "Tier not found" }, { status: 404 });
//     }

//     await Tier.findByIdAndDelete(id);

//     // Update order of remaining tiers
//     await Tier.updateMany(
//       { order: { $gt: tierToDelete.order } },
//       { $inc: { order: -1 } }
//     );

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Error deleting tier:", error);
//     return NextResponse.json(
//       { error: "Failed to delete tier" },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Helper function to create Stripe product and price
async function createStripeProductAndPrice(tierData: any) {
  try {
    // Create product in Stripe
    const product = await stripe.products.create({
      name: tierData.name,
      description: tierData.description,
      metadata: {
        tierId: tierData._id?.toString(),
      },
    });

    // Create price in Stripe
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(
        parseFloat(tierData.discountedPrice || tierData.price) * 100
      ),
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });

    return { stripeProductId: product.id, stripePriceId: price.id };
  } catch (error) {
    console.error("Error creating Stripe product/price:", error);
    throw error;
  }
}

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

    // First create the tier in our database
    const tier = await Tier.create(data);

    // Then create corresponding Stripe product and price
    try {
      const { stripeProductId, stripePriceId } =
        await createStripeProductAndPrice(tier);

      // Update the tier with Stripe IDs
      const updatedTier = await Tier.findByIdAndUpdate(
        tier._id,
        { stripeProductId, stripePriceId },
        { new: true }
      );

      return NextResponse.json(updatedTier, { status: 201 });
    } catch (stripeError) {
      // If Stripe creation fails, delete the tier we just created
      await Tier.findByIdAndDelete(tier._id);
      throw stripeError;
    }
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

    // Update the tier in our database first
    const updatedTier = await Tier.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // If price changed, create a new Stripe price and update the tier
    if (priceChanged || discountedPriceChanged) {
      try {
        const newPrice = await stripe.prices.create({
          product: existingTier.stripeProductId,
          unit_amount: Math.round(
            parseFloat(updatedTier.discountedPrice || updatedTier.price) * 100
          ),
          currency: "usd",
          recurring: {
            interval: "month",
          },
        });

        // Update the tier with the new price ID
        await Tier.findByIdAndUpdate(id, { stripePriceId: newPrice.id });

        // Archive the old price in Stripe
        if (existingTier.stripePriceId) {
          await stripe.prices.update(existingTier.stripePriceId, {
            active: false,
          });
        }

        // Return the fully updated tier
        const finalTier = await Tier.findById(id);
        return NextResponse.json(finalTier);
      } catch (stripeError) {
        console.error("Error updating Stripe price:", stripeError);
        // Revert the tier update if Stripe update fails
        await Tier.findByIdAndUpdate(id, existingTier);
        throw stripeError;
      }
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

    // First archive the Stripe product
    if (tierToDelete.stripeProductId) {
      try {
        await stripe.products.update(tierToDelete.stripeProductId, {
          active: false,
        });

        // Archive all prices associated with this product
        const prices = await stripe.prices.list({
          product: tierToDelete.stripeProductId,
          active: true,
        });

        for (const price of prices.data) {
          await stripe.prices.update(price.id, { active: false });
        }
      } catch (stripeError) {
        console.error("Error archiving Stripe product:", stripeError);
        // Continue with deletion even if Stripe archiving fails
      }
    }

    // Then delete from our database
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
