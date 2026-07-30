// app/api/settings/unitsettingapi/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

import { isSellerRole } from "@/lib/roles";
interface SettingsPayload {
  type: "unit" | "call";
  data: {
    units: number;
    cost?: number;
    seconds?: number;
  };
  index?: number;
}

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !isSellerRole(session.user?.role)) {
      return unauthorized("Authentication required");
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return notFound("User");
    }

    return NextResponse.json(
      {
        unitPricingOptions: user.unitPricingOptions,
        callChargeOptions: user.callChargeOptions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return internalError("Internal server error");
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !isSellerRole(session.user?.role)) {
      return unauthorized("Authentication required");
    }

    const { type, data } = (await req.json()) as SettingsPayload;

    // Validate input based on type
    if (type === "unit") {
      if (
        typeof data.units !== "number" ||
        typeof data.cost !== "number" ||
        data.units <= 0 ||
        data.cost <= 0
      ) {
        return badRequest("Units and cost must be positive numbers.");
      }
    } else if (type === "call") {
      if (
        typeof data.units !== "number" ||
        typeof data.seconds !== "number" ||
        data.units <= 0 ||
        data.seconds <= 0
      ) {
        return badRequest("Units and seconds must be positive numbers.");
      }
    } else {
      return badRequest("Invalid settings type.");
    }

    const updateQuery =
      type === "unit"
        ? {
            $push: {
              unitPricingOptions: { units: data.units, cost: data.cost! },
            },
          }
        : {
            $push: {
              callChargeOptions: {
                units: data.units,
                seconds: data.seconds!,
              },
            },
          };

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      updateQuery,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      return notFound("User");
    }

    return NextResponse.json(
      {
        message: "Settings added successfully",
        unitPricingOptions: user.unitPricingOptions,
        callChargeOptions: user.callChargeOptions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return internalError("Internal server error");
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !isSellerRole(session.user?.role)) {
      return unauthorized("Authentication required");
    }

    const { type, data, index } = (await req.json()) as SettingsPayload;

    // Validate input
    if (typeof index !== "number" || index < 0) {
      return badRequest("Invalid index for edit");
    }

    const user = await User.findOne({ email: session.user.email }).select(
      "unitPricingOptions callChargeOptions",
    );
    if (!user) {
      return notFound("User");
    }

    // Update the appropriate option
    if (type === "unit") {
      if (index >= user.unitPricingOptions.length) {
        return badRequest("Invalid index for unit pricing edit");
      }
      if (
        typeof data.units !== "number" ||
        typeof data.cost !== "number" ||
        data.units <= 0 ||
        data.cost <= 0
      ) {
        return badRequest("Units and cost must be positive numbers.");
      }
      await User.updateOne(
        { email: session.user.email },
        {
          $set: {
            [`unitPricingOptions.${index}`]: {
              units: data.units,
              cost: data.cost!,
            },
          },
        },
        { runValidators: true },
      );
    } else if (type === "call") {
      if (index >= user.callChargeOptions.length) {
        return badRequest("Invalid index for call charge edit");
      }
      if (
        typeof data.units !== "number" ||
        typeof data.seconds !== "number" ||
        data.units <= 0 ||
        data.seconds <= 0
      ) {
        return badRequest("Units and seconds must be positive numbers.");
      }
      await User.updateOne(
        { email: session.user.email },
        {
          $set: {
            [`callChargeOptions.${index}`]: {
              units: data.units,
              seconds: data.seconds!,
            },
          },
        },
        { runValidators: true },
      );
    } else {
      return badRequest("Invalid settings type.");
    }
    const updatedUser = await User.findOne({
      email: session.user.email,
    }).select("unitPricingOptions callChargeOptions");

    if (!updatedUser) {
      return notFound("User");
    }

    return NextResponse.json(
      {
        message: "Settings updated successfully",
        unitPricingOptions: updatedUser.unitPricingOptions,
        callChargeOptions: updatedUser.callChargeOptions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return internalError("Internal server error");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email || !isSellerRole(session.user?.role)) {
      return unauthorized("Authentication required");
    }

    const { type, index } = (await req.json()) as {
      type: "unit" | "call";
      index: number;
    };

    const user = await User.findOne({ email: session.user.email }).select(
      "unitPricingOptions callChargeOptions",
    );
    if (!user) {
      return notFound("User");
    }

    // Delete the appropriate option
    if (type === "unit") {
      if (index < 0 || index >= user.unitPricingOptions.length) {
        return badRequest("Invalid index for unit pricing delete");
      }

      const nextUnitPricingOptions = [...user.unitPricingOptions];
      nextUnitPricingOptions.splice(index, 1);

      await User.updateOne(
        { email: session.user.email },
        { $set: { unitPricingOptions: nextUnitPricingOptions } },
        { runValidators: true },
      );
    } else if (type === "call") {
      if (index < 0 || index >= user.callChargeOptions.length) {
        return badRequest("Invalid index for call charge delete");
      }

      const nextCallChargeOptions = [...user.callChargeOptions];
      nextCallChargeOptions.splice(index, 1);

      await User.updateOne(
        { email: session.user.email },
        { $set: { callChargeOptions: nextCallChargeOptions } },
        { runValidators: true },
      );
    } else {
      return badRequest("Invalid settings type.");
    }

    const updatedUser = await User.findOne({
      email: session.user.email,
    }).select("unitPricingOptions callChargeOptions");

    if (!updatedUser) {
      return notFound("User");
    }

    return NextResponse.json(
      {
        message: "Settings deleted successfully",
        unitPricingOptions: updatedUser.unitPricingOptions,
        callChargeOptions: updatedUser.callChargeOptions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return internalError("Internal server error");
  }
}
