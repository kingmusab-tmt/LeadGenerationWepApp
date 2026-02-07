import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsTemplate } from "@/models/smsCampaign";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const template = await SmsTemplate.findById(id);
  if (!template || template.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const template = await SmsTemplate.findById(id);
  if (!template || template.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, textContent, category } = body;

  const updated = await SmsTemplate.findByIdAndUpdate(
    id,
    {
      ...(name && { name }),
      ...(textContent && { textContent }),
      ...(category && { category }),
    },
    { new: true },
  );
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const template = await SmsTemplate.findById(id);
  if (!template || template.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  await SmsTemplate.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
