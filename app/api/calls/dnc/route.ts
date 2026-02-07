import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";

/**
 * DNC (Do-Not-Call) List Management API
 * GET: Get DNC list for a tracking number
 * POST: Add number(s) to DNC list
 * DELETE: Remove a number from DNC list
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phoneNumber = req.nextUrl.searchParams.get("phoneNumber");
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "phoneNumber query parameter is required" },
        { status: 400 },
      );
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tn = seller.trackingNumbers?.find(
      (n: any) => n.phoneNumber === phoneNumber,
    );
    if (!tn) {
      return NextResponse.json(
        { error: "Tracking number not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      dncEnabled: tn.dncEnabled || false,
      dncList: tn.dncList || [],
      count: (tn.dncList || []).length,
    });
  } catch (error) {
    console.error("Error fetching DNC list:", error);
    return NextResponse.json(
      { error: "Failed to fetch DNC list" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber, numbers } = await req.json();

    if (!phoneNumber || !numbers || !Array.isArray(numbers)) {
      return NextResponse.json(
        { error: "phoneNumber and numbers[] are required" },
        { status: 400 },
      );
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tn = seller.trackingNumbers?.find(
      (n: any) => n.phoneNumber === phoneNumber,
    );
    if (!tn) {
      return NextResponse.json(
        { error: "Tracking number not found" },
        { status: 404 },
      );
    }

    const currentList = new Set(tn.dncList || []);
    const cleaned = numbers
      .map((n: string) => n.replace(/[^+\d]/g, "").trim())
      .filter((n: string) => n.length >= 10);

    let added = 0;
    for (const num of cleaned) {
      if (!currentList.has(num)) {
        currentList.add(num);
        added++;
      }
    }

    tn.dncList = Array.from(currentList);
    await seller.save();

    return NextResponse.json({
      success: true,
      added,
      total: tn.dncList.length,
    });
  } catch (error) {
    console.error("Error adding to DNC list:", error);
    return NextResponse.json(
      { error: "Failed to add to DNC list" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber, number } = await req.json();

    if (!phoneNumber || !number) {
      return NextResponse.json(
        { error: "phoneNumber and number are required" },
        { status: 400 },
      );
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tn = seller.trackingNumbers?.find(
      (n: any) => n.phoneNumber === phoneNumber,
    );
    if (!tn) {
      return NextResponse.json(
        { error: "Tracking number not found" },
        { status: 404 },
      );
    }

    const before = (tn.dncList || []).length;
    tn.dncList = (tn.dncList || []).filter((n: string) => n !== number);
    const removed = before - tn.dncList.length;

    await seller.save();

    return NextResponse.json({
      success: true,
      removed,
      total: tn.dncList.length,
    });
  } catch (error) {
    console.error("Error removing from DNC list:", error);
    return NextResponse.json(
      { error: "Failed to remove from DNC list" },
      { status: 500 },
    );
  }
}
