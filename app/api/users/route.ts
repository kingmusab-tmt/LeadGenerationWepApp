import { authOptions } from "@/auth";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { Buyer } from "@/models/leadbuyers";
import { invalidateSessionCache } from "@/lib/cachedSession";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return NextResponse.json(
      { success: false, message: "Method not allowed" },
      { status: 405 },
    );
  }
  await dbConnect();

  let filterUser = {};

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const email = session?.user?.email;
  if (!email) {
    return Response.json(
      { success: false, message: "User Email not Found" },
      { status: 401 },
    );
  }
  filterUser = { email };

  try {
    const user = await User.findOne(filterUser).lean();

    if (!user) {
      // Clear stale session cache so the client can re-authenticate cleanly
      await invalidateSessionCache(email);
      return NextResponse.json(
        { success: false, message: "Session expired. Please sign in again." },
        { status: 401 },
      );
    }
    if (user.role === "buyer") {
      const leadbuyerDetail = await Buyer.findOne({
        email: user.email,
      } as any).lean();
      return NextResponse.json({ user, leadbuyerDetail }, { status: 200 });
    }

    // Return user for any other role (seller, admin, staff, etc.)
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 500 });
  }
}
