// import { NextRequest, NextResponse } from "next/server";
// import dbConnect from "@/lib/connectdb";
// import { User } from "@/models/user"; // Import the User model

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const sellerId = searchParams.get("sellerId");

//   if (!sellerId) {
//     return NextResponse.json(
//       { message: "Seller ID is required" },
//       { status: 400 }
//     );
//   }

//   try {
//     // Connect to the database
//     await dbConnect();

//     // Find the user (seller) by sellerId
//     const user = await User.findOne({ sellerId });

//     if (!user) {
//       return NextResponse.json(
//         { message: "Seller not found" },
//         { status: 404 }
//       );
//     }

//     // Return the Twilio activation status
//     return NextResponse.json({ twilioActivated: user.twilioActivated });
//   } catch (error) {
//     console.error("Error fetching Twilio status:", error);
//     return NextResponse.json(
//       { message: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    // Validate sellerId parameter
    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      );
    }

    // Authorization check - ensure user can only access their own data
    if (session.user.id !== sellerId && session.user.role !== "seller") {
      return NextResponse.json(
        { error: "Forbidden - You can only access your own data" },
        { status: 403 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user with subscription data
    const user = await User.findOne(
      { _id: sellerId },
      {
        twilioActivated: 1,
        "subscription.subscriptionLimits": 1,
        "subscription.subscriptionTierId": 1,
        trackingNumbers: 1,
      }
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Prepare response data
    const responseData = {
      twilioActivated: user.twilioActivated || false,
      currentCount: Array.isArray(user.trackingNumbers)
        ? user.trackingNumbers.length
        : 0,
      subscriptionLimits: user.subscription?.subscriptionLimits || {
        twilioNumbers: 0,
      },
      tierId: user.subscription?.subscriptionTierId || null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in GET /api/call_twillo/twiliostatus:", error);

    // Don't expose internal errors to client
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
// This code handles the GET request to check the Twilio activation status for a seller.
// It connects to the database, retrieves the seller's Twilio activation status,
