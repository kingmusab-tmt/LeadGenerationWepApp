import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { sellerId } = await req.json();

    const seller = await User.findById(sellerId);
    if (!seller)
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });

    seller.twilioActivated = true;
    await seller.save();

    return new NextResponse(
      JSON.stringify({ success: true, message: "Twilio activated" }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: "Activation failed" }), {
      status: 500,
    });
  }
}
