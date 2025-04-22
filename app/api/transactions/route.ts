// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/auth";
// import { User } from "@/models/user";
// import { Transaction } from "@/models/transactions";

// export async function GET(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session || !session.user?.email) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     const seller = (await User.findOne({ email: session.user.email }).select(
//       "_id"
//     )) as { _id: string | unknown };

//     if (!seller) {
//       return NextResponse.json(
//         { success: false, message: "Buyer not found" },
//         { status: 404 }
//       );
//     }

//     // Convert buyer._id to a string

//     const sellerId =
//       typeof seller._id === "string" ? seller._id : seller._id?.toString();
//     // Fetch transactions using the stringified buyerId
//     const transactions = await Transaction.find({ userId: sellerId }).sort({
//       createdAt: -1,
//     });

//     // Return the transactions in the expected format
//     return NextResponse.json({ success: true, data: transactions });
//   } catch (error) {
//     console.error("Error fetching transactions:", error);
//     return NextResponse.json(
//       { success: false, message: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/user";
import { Transaction } from "@/models/transactions";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Extract buyerId from the URL search parameters
    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get("buyerId");

    let userId: string | undefined;

    if (buyerId) {
      // If buyerId is provided in the URL, use it
      userId = buyerId;
    } else {
      // Otherwise, fetch the seller's ID from the session
      const seller = await User.findOne({ email: session.user.email }).select(
        "_id"
      );

      if (!seller) {
        return NextResponse.json(
          { success: false, message: "Seller not found" },
          { status: 404 }
        );
      }

      // Convert seller._id to a string
      userId =
        typeof seller._id === "string" ? seller._id : seller._id?.toString();
    }

    // Fetch transactions using the userId (either sellerId or buyerId)
    const transactions = await Transaction.find({ userId }).sort({
      createdAt: -1,
    });

    // Return the transactions in the expected format
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
