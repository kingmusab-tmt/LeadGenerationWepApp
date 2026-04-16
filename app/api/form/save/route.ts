import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models";
import {
  internalError,
  methodNotAllowed,
  unauthorized,
} from "@/lib/api/error-handler";

export async function POST(request: Request) {
  // Ensure the request is a POST request
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("_id")
      .lean();
    if (!user?._id) {
      return unauthorized("User account not found");
    }

    const data = await request.json();
    const form = new Form({
      ...data,
      userId: user._id,
    });
    await form.save();
    return NextResponse.json({
      success: true,
      message: "Form saved successfully!",
    });
  } catch {
    return internalError("Failed to save form.");
  }
}
