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
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const encodedUrl = searchParams.get("url");

    if (!encodedUrl) {
      return NextResponse.json(
        { error: "Missing URL parameter" },
        { status: 400 },
      );
    }

    // Decode URL
    const originalUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");

    // Validate URL to prevent open redirect
    if (
      !originalUrl.startsWith("http://") &&
      !originalUrl.startsWith("https://")
    ) {
      return NextResponse.json(
        { error: "Invalid redirect URL" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Record click
    const analyticsEngine = new EmailAnalyticsEngine();
    await analyticsEngine.recordClick(token, originalUrl);

    // Redirect to original URL
    return NextResponse.redirect(originalUrl);
  } catch (error) {
    console.error("Error tracking click:", error);
    // Try to redirect to original URL even if tracking fails
    try {
      const { searchParams } = new URL(req.url);
      const encodedUrl = searchParams.get("url");
      if (encodedUrl) {
        const originalUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
        if (
          originalUrl.startsWith("http://") ||
          originalUrl.startsWith("https://")
        ) {
          return NextResponse.redirect(originalUrl);
        }
      }
    } catch {
      // Final fallback
    }
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 },
    );
  }
}
