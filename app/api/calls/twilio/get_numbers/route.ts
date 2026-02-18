// This file is part of the Twilio integration for fetching tracking numbers.
// It connects to the database, retrieves the seller's tracking numbers,
// and returns them in the response.
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    // Ensure the user is authenticated and has a valid session
    if (session.user.role !== "seller") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }
    await dbConnect();

    const purpose = req.nextUrl.searchParams.get("purpose");
    const seller = await User.findById(session.user.id);
    if (!seller)
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });

    let numbers = seller.trackingNumbers || [];

    // Filter by purpose if provided
    if (purpose) {
      numbers = numbers.filter((num: any) => num.purpose === purpose);
    }

    return new NextResponse(JSON.stringify(numbers), {
      status: 200,
    });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch numbers" }),
      { status: 500 },
    );
  }
}
