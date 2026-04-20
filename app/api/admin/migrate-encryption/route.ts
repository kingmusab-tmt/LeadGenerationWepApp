import { NextResponse } from "next/server";

function notImplemented() {
  return NextResponse.json(
    {
      success: false,
      message: "Encryption migration endpoint is not implemented.",
    },
    { status: 501 },
  );
}

export async function GET() {
  return notImplemented();
}

export async function POST() {
  return notImplemented();
}
