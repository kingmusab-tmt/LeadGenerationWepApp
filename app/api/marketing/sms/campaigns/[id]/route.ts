import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsCampaign } from "@/models/smsCampaign";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const campaign = await SmsCampaign.findById(id);
  if (!campaign || campaign.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const body = await req.json();
  const campaign = await SmsCampaign.findById(id);
  if (!campaign || campaign.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await SmsCampaign.findByIdAndUpdate(id, body, {
    new: true,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const campaign = await SmsCampaign.findById(id);
  if (!campaign || campaign.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  await SmsCampaign.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
