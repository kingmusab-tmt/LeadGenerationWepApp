import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { User } from "@/models/user"; // Import the Referral model
import dbConnect from "@/lib/connectdb";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  await dbConnect();
  const data = await req.json();
  const { _id, referralCode, ...UserInfo } = data;

  let filter = {};
  if (_id) {
    filter = { _id };
  } else {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    filter = { email };
  }

  // Find the user by email or _id
  const user = await User.findOne(filter);

  if (!user) {
    return Response.json({
      message: "User not found",
      status: 404,
      success: false,
    });
  }

  // Update the user with the provided information
  await User.updateOne(filter, UserInfo);

  return Response.json(true);
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  const data = await req.json();
  const { _id, referralCode, ...updateData } = data;

  let filter = {};
  if (_id) {
    filter = { _id };
  } else {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    filter = { email };
  }

  // Find the user by email or _id
  const user = await User.findOne(filter);

  if (!user) {
    return Response.json({
      message: "User not found",
      status: 404,
      success: false,
    });
  }

  // Update the user with the provided information
  await User.updateOne(filter, { $set: updateData });

  return Response.json(true);
}
