import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return unauthorized("Authentication required");
    }

    await dbConnect();
    if (session.user.role === "buyer") {
      // Find the buyer by email
      const buyer = await Buyer.findOne({ email: session.user.email });

      if (!buyer || !buyer.registeredWith) {
        return notFound("Buyer", "Buyer or associated seller not found");
      }

      // Use the registeredWith ID to find the seller in the User model
      const seller = await User.findById(buyer.registeredWith);

      if (!seller) {
        return notFound("Seller", "Seller user not found");
      }
      //("property ID", seller.tawkPropertyId);
      //("widget ID", seller.tawkWidgetId);

      return NextResponse.json(
        {
          success: true,
          propertyId:
            seller.tawkPropertyId || process.env.NEXT_PUBLIC_TAWKPROPERTYID!,
          widgetId:
            seller.tawkWidgetId || process.env.NEXT_PUBLIC_TAWKWIDGETID!,
        },
        { status: 200 },
      );
    } else if (session.user.role === "seller") {
      const seller = await User.findOne({ email: session.user.email });

      return NextResponse.json(
        {
          success: true,
          propertyId:
            seller?.tawkPropertyId || process.env.NEXT_PUBLIC_TAWKPROPERTYID!,
          widgetId:
            seller?.tawkWidgetId || process.env.NEXT_PUBLIC_TAWKWIDGETID!,
        },
        { status: 200 },
      );
    }
    return forbidden("Unsupported role for live chat settings");
  } catch (error) {
    return internalError(
      error instanceof Error ? error.message : "Internal Server Error",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "seller") {
      return unauthorized("Authentication required");
    }
    await dbConnect();

    const body = await req.json();
    const { tawkPropertyId, tawkWidgetId } = body;

    if (!tawkPropertyId || !tawkWidgetId) {
      return badRequest("Missing fields");
    }

    const updatedSeller = await User.findOneAndUpdate(
      { email: session.user.email },
      { tawkPropertyId, tawkWidgetId },
      { new: true, upsert: true },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Tawk.to configuration updated successfully!",
        data: {
          tawkPropertyId: updatedSeller.tawkPropertyId,
          tawkWidgetId: updatedSeller.tawkWidgetId,
        },
        seller: updatedSeller,
      },
      { status: 200 },
    );
  } catch (error) {
    return internalError(
      error instanceof Error ? error.message : "Internal Server Error",
    );
  }
}
