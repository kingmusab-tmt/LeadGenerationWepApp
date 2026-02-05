// GET /api/email/track/open/[token] - Track email open
// GET /api/email/track/click/[token] - Track email click
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { EmailAnalyticsEngine } from "@/lib/emailMarketingEngine";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/track/open/[token]
 * Track email open event
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await dbConnect();

    const analyticsEngine = new EmailAnalyticsEngine();
    await analyticsEngine.recordOpen(token);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error tracking open:", error);
    // Still return pixel on error
    const pixel = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);
    return new NextResponse(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
      },
    });
  }
}
