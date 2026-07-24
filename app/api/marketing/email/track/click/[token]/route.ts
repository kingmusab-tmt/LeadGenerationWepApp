// GET /api/email/track/click/[token] - Track email click
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { EmailAnalyticsEngine } from "@/lib/emailMarketingEngine";
import { EmailQueue, EmailCampaign } from "@/models/emailCampaign";

export const dynamic = "force-dynamic";

/**
 * Every http(s) href actually present in the campaign's own content, so a
 * click can only ever redirect to a URL the seller genuinely put in that
 * email — not to an arbitrary destination supplied via the query string.
 */
function extractAllowedUrls(html: string): Set<string> {
  const urls = new Set<string>();
  const linkRegex = /href="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1].startsWith("http://") || match[1].startsWith("https://")) {
      urls.add(match[1]);
    }
  }
  return urls;
}

const FALLBACK_URL = process.env.NEXTAUTH_URL || "/";

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

    // Only redirect if this exact URL was actually one of the links in the
    // campaign this token belongs to — otherwise the token+url pair could be
    // used as an open redirect through our own domain to anywhere.
    const queueItem = await EmailQueue.findOne({ trackingToken: token })
      .select("campaignId")
      .lean();
    if (queueItem) {
      const campaign = await EmailCampaign.findById(queueItem.campaignId)
        .select("htmlContent")
        .lean();
      const allowedUrls = campaign
        ? extractAllowedUrls(campaign.htmlContent || "")
        : new Set<string>();
      if (!allowedUrls.has(originalUrl)) {
        return NextResponse.redirect(FALLBACK_URL);
      }
    } else {
      return NextResponse.redirect(FALLBACK_URL);
    }

    // Record click
    const analyticsEngine = new EmailAnalyticsEngine();
    await analyticsEngine.recordClick(token, originalUrl);

    // Redirect to original URL
    return NextResponse.redirect(originalUrl);
  } catch (error) {
    console.error("Error tracking click:", error);
    return NextResponse.redirect(FALLBACK_URL);
  }
}
