import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { internalError, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  try {
    if (!session) return unauthorized("Authentication required");

    // Connect to MongoDB
    await dbConnect();
    //(`userId = ${userId}`);
    // Fetch forms created by the user
    const forms = await Form.find({ userId });
    //(forms);
    return NextResponse.json(forms);
  } catch (error) {
    console.error("Failed to fetch forms:", error);
    return internalError("Failed to fetch forms.");
  }
}
