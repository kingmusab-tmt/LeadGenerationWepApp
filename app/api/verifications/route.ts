import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Verifications } from "@/models/vertification"; // Ensure the correct path and model name

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const verificationId = searchParams.get("id");

  try {
    if (verificationId) {
      // Fetch a single verification by ID
      const verification = await Verifications.findById(verificationId);
      if (!verification) {
        return NextResponse.json(
          { success: false, message: "Verification not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: true, data: verification },
        { status: 200 }
      );
    } else {
      // Fetch all verifications
      const verifications = await Verifications.find();
      return NextResponse.json(
        { success: true, data: verifications },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch verifications." },
      { status: 500 }
    );
  }
}
