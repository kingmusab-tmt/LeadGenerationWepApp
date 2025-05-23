// app/api/settings/unitsettingapi/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

interface SettingsPayload {
  type: "unit" | "call";
  data: {
    units: number;
    cost?: number;
    seconds?: number;
  };
  index?: number;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "seller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        unitPricingOptions: user.unitPricingOptions,
        callChargeOptions: user.callChargeOptions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "seller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        return NextResponse.json(
          { error: "Units and cost must be positive numbers." },
          { status: 400 }
        );
      }
    } else if (type === "call") {
      if (
        typeof data.units !== "number" ||
        typeof data.seconds !== "number" ||
        data.units <= 0 ||
        data.seconds <= 0
      ) {
        return NextResponse.json(
          { error: "Units and seconds must be positive numbers." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid settings type." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add the new option
    if (type === "unit") {
      user.unitPricingOptions.push({ units: data.units, cost: data.cost! });
    } else {
      user.callChargeOptions.push({
        units: data.units,
        seconds: data.seconds!,
      });
    }

    await user.save();

    return NextResponse.json(
      {
        message: "Settings added successfully",
        unitPricingOptions: user.unitPricingOptions,
        callChargeOptions: user.callChargeOptions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "seller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data, index } = (await req.json()) as SettingsPayload;

    // Validate input
    if (typeof index !== "number" || index < 0) {
      return NextResponse.json(
        { error: "Invalid index for edit" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the appropriate option
    if (type === "unit") {
      if (index >= user.unitPricingOptions.length) {
        return NextResponse.json(
          { error: "Invalid index for unit pricing edit" },
          { status: 400 }
        );
      }
      if (
        typeof data.units !== "number" ||
        typeof data.cost !== "number" ||
        data.units <= 0 ||
        data.cost <= 0
      ) {
        return NextResponse.json(
          { error: "Units and cost must be positive numbers." },
          { status: 400 }
        );
      }
      user.unitPricingOptions[index] = { units: data.units, cost: data.cost! };
    } else if (type === "call") {
      if (index >= user.callChargeOptions.length) {
        return NextResponse.json(
          { error: "Invalid index for call charge edit" },
          { status: 400 }
        );
      }
      if (
        typeof data.units !== "number" ||
        typeof data.seconds !== "number" ||
        data.units <= 0 ||
        data.seconds <= 0
      ) {
        return NextResponse.json(
          { error: "Units and seconds must be positive numbers." },
          { status: 400 }
        );
      }
      user.callChargeOptions[index] = {
        units: data.units,
        seconds: data.seconds!,
      };
    } else {
      return NextResponse.json(
        { error: "Invalid settings type." },
        { status: 400 }
      );
    }

    await user.save();

    return NextResponse.json(
      {
        message: "Settings updated successfully",
        unitPricingOptions: user.unitPricingOptions,
        callChargeOptions: user.callChargeOptions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, index } = (await req.json()) as {
      type: "unit" | "call";
      index: number;
    };

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete the appropriate option
    if (type === "unit") {
      if (index < 0 || index >= user.unitPricingOptions.length) {
        return NextResponse.json(
          { error: "Invalid index for unit pricing delete" },
          { status: 400 }
        );
      }
      user.unitPricingOptions.splice(index, 1);
    } else if (type === "call") {
      if (index < 0 || index >= user.callChargeOptions.length) {
        return NextResponse.json(
          { error: "Invalid index for call charge delete" },
          { status: 400 }
        );
      }
      user.callChargeOptions.splice(index, 1);
    } else {
      return NextResponse.json(
        { error: "Invalid settings type." },
        { status: 400 }
      );
    }

    await user.save();

    return NextResponse.json(
      {
        message: "Settings deleted successfully",
        unitPricingOptions: user.unitPricingOptions,
        callChargeOptions: user.callChargeOptions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in settings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
