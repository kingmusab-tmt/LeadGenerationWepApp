import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";

// Get single tier
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("Id");

    await dbConnect();
    const tier = await Tier.findById(id);
    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }
    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error fetching tier:", error);
    return NextResponse.json(
      { error: "Failed to fetch tier" },
      { status: 500 }
    );
  }
}

// Update tier
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("Id");

    const data = await req.json();
    await dbConnect();

    const tier = await Tier.findByIdAndUpdate(id, data, { new: true });
    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }
    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error updating tier:", error);
    return NextResponse.json(
      { error: "Failed to update tier" },
      { status: 500 }
    );
  }
}

// Delete tier
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("Id");

    await dbConnect();
    const tier = await Tier.findByIdAndDelete(id);
    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tier:", error);
    return NextResponse.json(
      { error: "Failed to delete tier" },
      { status: 500 }
    );
  }
}
