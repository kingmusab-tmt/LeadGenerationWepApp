import { authOptions } from "@/auth";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { NextRequest, NextResponse } from "next/server";
import { Buyer } from "@/models/leadbuyers";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return NextResponse.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }
  await dbConnect();

  let filterUser = {};

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  const email = session?.user?.email;
  if (!email) {
    return Response.json(
      { success: false, message: "User Email not Found" },
      { status: 401 }
    );
  }
  filterUser = { email };

  try {
    const user = await User.findOne(filterUser).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    if (user.role == "buyer") {
      const leadbuyerDetail = await Buyer.findOne({
        email: user.email,
      } as any).lean();
      return NextResponse.json({ user, leadbuyerDetail }, { status: 200 });
    } else if (user.role == "seller") {
      return NextResponse.json(user, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 500 });
  }
}
