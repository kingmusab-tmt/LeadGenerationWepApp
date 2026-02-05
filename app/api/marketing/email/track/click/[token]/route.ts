// GET /api/email/track/click/[token] - Track email click
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { EmailAnalyticsEngine } from "@/lib/emailMarketingEngine";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/track/click/[token]
 * Track email click and redirect to original URL
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const encodedUrl = searchParams.get("url");

    if (!encodedUrl) {
      return NextResponse.json(
        { error: "Missing URL parameter" },
        { status: 400 }
      );
    }

    // Decode URL
    const originalUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");

    await dbConnect();

    // Record click
    const analyticsEngine = new EmailAnalyticsEngine();
    await analyticsEngine.recordClick(token, originalUrl);

    // Redirect to original URL
    return NextResponse.redirect(originalUrl);
  } catch (error) {
    console.error("Error tracking click:", error);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
