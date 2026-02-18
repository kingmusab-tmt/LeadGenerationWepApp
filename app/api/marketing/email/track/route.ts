import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/connectdb";
import { EmailCampaign } from "@/models/emailCampaign";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const campaignId = searchParams.get("campaignId");
    const email = searchParams.get("email");

    if (!action || !campaignId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Validate action
    if (!["open", "click"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Find the campaign
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Update analytics based on action
    if (action === "open") {
      // Increment opened count
      campaign.analytics = campaign.analytics || {
        sent: 0,
        opened: 0,
        clicked: 0,
      };
      campaign.analytics.opened = (campaign.analytics.opened || 0) + 1;

      // Track individual recipient open
      if (email && campaign.recipientEmails) {
        const recipientIndex = campaign.recipientEmails.findIndex(
          (r: string) => r === email,
        );
        if (recipientIndex !== -1) {
          // You could track individual opens here if you want to prevent double counting
          // For now, we just increment the total
        }
      }

      await campaign.save();

      // Return a 1x1 transparent pixel
      const pixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64",
      );
      return new NextResponse(pixel, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } else if (action === "click") {
      // Increment clicked count
      campaign.analytics = campaign.analytics || {
        sent: 0,
        opened: 0,
        clicked: 0,
      };
      campaign.analytics.clicked = (campaign.analytics.clicked || 0) + 1;
      await campaign.save();

      // Redirect to the original URL
      const targetUrl = searchParams.get("url");
      if (targetUrl) {
        return NextResponse.redirect(targetUrl, { status: 302 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track email event" },
      { status: 500 },
    );
  }
}
