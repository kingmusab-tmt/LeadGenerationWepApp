import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/user";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await User.findOne({ email: session.user.email });

  if (!user?.subscription) {
    return NextResponse.json(
      {
        error: "No subscription found",
        redirect: "/pricing",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    subscription: user.subscription,
  });
}
