import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();
    if (session.user.role === "buyer") {
      // Find the buyer by email
      const buyer = await Buyer.findOne({ email: session.user.email });

      if (!buyer || !buyer.registeredWith) {
        return NextResponse.json(
          { success: false, message: "Buyer or associated seller not found" },
          { status: 404 }
        );
      }

      // Use the registeredWith ID to find the seller in the User model
      const seller = await User.findById(buyer.registeredWith);

      if (!seller) {
        return NextResponse.json(
          { success: false, message: "Seller user not found" },
          { status: 404 }
        );
      }
      console.log("property ID", seller.tawkPropertyId);
      console.log("widget ID", seller.tawkWidgetId);

      return NextResponse.json(
        {
          success: true,
          propertyId:
            seller.tawkPropertyId || process.env.NEXT_PUBLIC_TAWKPROPERTYID!,
          widgetId:
            seller.tawkWidgetId || process.env.NEXT_PUBLIC_TAWKWIDGETID!,
        },
        { status: 200 }
      );
    } else if (session.user.role === "seller") {
      console.log("Property", process.env.NEXT_PUBLIC_TAWKPROPERTYID!);
      console.log("widget", process.env.NEXT_PUBLIC_TAWKWIDGETID!);
      return NextResponse.json(
        {
          success: true,
          propertyId: process.env.NEXT_PUBLIC_TAWKPROPERTYID!,
          widgetId: process.env.NEXT_PUBLIC_TAWKWIDGETID!,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "seller") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    await dbConnect();

    const body = await req.json();
    const { tawkPropertyId, tawkWidgetId } = body;

    if (!tawkPropertyId || !tawkWidgetId) {
      return NextResponse.json(
        { success: false, message: "Missing fields" },
        { status: 400 }
      );
    }

    const updatedSeller = await User.findOneAndUpdate(
      { email: session.user.email },
      { tawkPropertyId, tawkWidgetId },
      { new: true, upsert: true }
    );

    return NextResponse.json(
      { success: true, seller: updatedSeller },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
