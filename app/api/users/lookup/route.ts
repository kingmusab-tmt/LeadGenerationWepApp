import { authOptions } from "@/auth";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/lookup?ids=id1,id2,id3
 * Returns basic user info (name, email) for given user IDs
 * Used for displaying user details in receipts
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { success: false, message: "No user IDs provided" },
      { status: 400 },
    );
  }

  const ids = idsParam.split(",").filter((id) => id.trim());

  if (ids.length === 0) {
    return NextResponse.json(
      { success: false, message: "No valid user IDs provided" },
      { status: 400 },
    );
  }

  if (ids.length > 10) {
    return NextResponse.json(
      { success: false, message: "Maximum 10 user IDs allowed per request" },
      { status: 400 },
    );
  }

  try {
    await dbConnect();

    const users = await User.find(
      { _id: { $in: ids } },
      { _id: 1, name: 1, email: 1, businessName: 1 },
    ).lean();

    // Create a map for easy lookup
    const userMap: Record<
      string,
      { name: string; email: string; businessName?: string }
    > = {};

    users.forEach((user: any) => {
      userMap[user._id.toString()] = {
        name: user.name || "Unknown",
        email: user.email || "N/A",
        businessName: user.businessName || undefined,
      };
    });

    return NextResponse.json(
      { success: true, users: userMap },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error looking up users:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching user details" },
      { status: 500 },
    );
  }
}
