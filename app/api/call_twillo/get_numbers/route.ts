import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const sellerId = req.nextUrl.searchParams.get("sellerId");

    const seller = await User.findById(sellerId);
    if (!seller)
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });

    return new NextResponse(JSON.stringify(seller.trackingNumbers), {
      status: 200,
    });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch numbers" }),
      { status: 500 }
    );
  }
}
