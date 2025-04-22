import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  try {
    // Connect to MongoDB
    await dbConnect();
    console.log(`userId = ${userId}`);
    // Fetch forms created by the user
    const forms = await Form.find({ userId });
    console.log(forms);
    return NextResponse.json(forms);
  } catch (error) {
    console.error("Failed to fetch forms:", error);
    return NextResponse.json(
      { message: "Failed to fetch forms." },
      { status: 500 }
    );
  }
}
