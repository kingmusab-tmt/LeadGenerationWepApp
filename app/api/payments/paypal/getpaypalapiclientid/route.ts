import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    return NextResponse.json({ success: true, clientId });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
