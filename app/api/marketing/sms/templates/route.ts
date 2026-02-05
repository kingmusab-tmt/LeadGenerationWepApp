import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsTemplate } from "@/models/smsCampaign";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const templates = await SmsTemplate.find({ userId: session.user.id }).sort({
    updatedAt: -1,
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const body = await req.json();
  const { name, textContent, category } = body;
  if (!name || !textContent)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const tpl = await SmsTemplate.create({
    userId: session.user.id,
    name,
    textContent,
    category: category || "custom",
  });
  return NextResponse.json(tpl, { status: 201 });
}
