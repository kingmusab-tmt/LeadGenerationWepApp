import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsCampaign } from "@/models/smsCampaign";
import { smsMarketingEngine } from "@/lib/smsMarketingEngine";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await dbConnect();
    const campaign = await SmsCampaign.findById(id);
    if (!campaign)
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    if (campaign.userId !== session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (action === "send") {
      const result = await smsMarketingEngine.sendCampaignImmediate(id);
      if (!result.success)
        return NextResponse.json({ error: result.message }, { status: 400 });
      return NextResponse.json(
        { message: result.message, sent: result.sent, failed: result.failed },
        { status: 200 },
      );
    }

    if (action === "test") {
      const body = await req.json();
      const { testPhone } = body;
      if (!testPhone)
        return NextResponse.json(
          { error: "Test phone required" },
          { status: 400 },
        );
      const result = await smsMarketingEngine.sendTestSms(id, testPhone);
      if (!result.success)
        return NextResponse.json({ error: result.message }, { status: 400 });
      return NextResponse.json({ message: result.message }, { status: 200 });
    }

    if (action === "pause") {
      if (campaign.status !== "sending")
        return NextResponse.json(
          { error: "Campaign is not currently sending" },
          { status: 400 },
        );
      await SmsCampaign.findByIdAndUpdate(id, { status: "paused" });
      return NextResponse.json(
        { message: "Campaign paused successfully" },
        { status: 200 },
      );
    }

    if (action === "resume") {
      if (campaign.status !== "paused")
        return NextResponse.json(
          { error: "Campaign is not paused" },
          { status: 400 },
        );
      await SmsCampaign.findByIdAndUpdate(id, { status: "sending" });
      // Resume sending remaining queue items
      const result = await smsMarketingEngine.sendCampaignImmediate(id);
      return NextResponse.json(
        {
          message: "Campaign resumed",
          sent: result.sent || 0,
          failed: result.failed || 0,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing SMS campaign action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 },
    );
  }
}
