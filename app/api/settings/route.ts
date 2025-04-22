import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    return new NextResponse(
      JSON.stringify({
        leadDistributionMethod: user.leadDistributionMethod,
        emailSettings: user.emailSettings || {},
        apiSettings: user.apiSettings || {},
        creditSetup: user.creditSetup || {},
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching settings:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const data = await req.json();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        leadDistributionMethod: data.leadDistributionMethod,
        emailSettings: data.emailSettings,
        apiSettings: data.apiSettings,
        creditSetup: data.creditSetup,
      },
      { new: true }
    );

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        leadDistributionMethod: user.leadDistributionMethod,
        emailSettings: user.emailSettings,
        apiSettings: user.apiSettings,
        creditSetup: user.creditSetup,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving settings:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
