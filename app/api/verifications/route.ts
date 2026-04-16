import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Verifications } from "@/models/vertification"; // Ensure the correct path and model name
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError, notFound } from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const verificationId = searchParams.get("id");

  try {
    if (verificationId) {
      // Fetch a single verification by ID
      const verification = await Verifications.findById(verificationId);
      if (!verification) {
        return notFound("Verification");
      }
      return NextResponse.json(
        { success: true, data: verification },
        { status: 200 },
      );
    } else {
      // Fetch all verifications
      const verifications = await Verifications.find();
      return NextResponse.json(
        { success: true, data: verifications },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error(error);
    return internalError("Failed to fetch verifications.");
  }
}
