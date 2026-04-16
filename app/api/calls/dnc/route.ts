import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

type TrackingNumberEntry = {
  phoneNumber?: string;
  dncEnabled?: boolean;
  dncList?: string[];
};

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
      return unauthorized("Authentication required");
    }

    const phoneNumber = req.nextUrl.searchParams.get("phoneNumber");
    if (!phoneNumber) {
      return badRequest("phoneNumber query parameter is required");
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return notFound("User");
    }

    const trackingNumbers =
      (seller.trackingNumbers as TrackingNumberEntry[] | undefined) || [];
    const tn = trackingNumbers.find((n) => n.phoneNumber === phoneNumber);
    if (!tn) {
      return notFound("Tracking number");
    }

    return NextResponse.json({
      success: true,
      dncEnabled: tn.dncEnabled || false,
      dncList: tn.dncList || [],
      count: (tn.dncList || []).length,
    });
  } catch (error) {
    console.error("Error fetching DNC list:", error);
    return internalError("Failed to fetch DNC list");
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    const { phoneNumber, numbers } = await req.json();

    if (!phoneNumber || !numbers || !Array.isArray(numbers)) {
      return badRequest("phoneNumber and numbers[] are required");
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return notFound("User");
    }

    const trackingNumbers =
      (seller.trackingNumbers as TrackingNumberEntry[] | undefined) || [];
    const tn = trackingNumbers.find((n) => n.phoneNumber === phoneNumber);
    if (!tn) {
      return notFound("Tracking number");
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
    return internalError("Failed to add to DNC list");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    const { phoneNumber, number } = await req.json();

    if (!phoneNumber || !number) {
      return badRequest("phoneNumber and number are required");
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return notFound("User");
    }

    const trackingNumbers =
      (seller.trackingNumbers as TrackingNumberEntry[] | undefined) || [];
    const tn = trackingNumbers.find((n) => n.phoneNumber === phoneNumber);
    if (!tn) {
      return notFound("Tracking number");
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
    return internalError("Failed to remove from DNC list");
  }
}
