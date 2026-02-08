import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const { status } = await req.json();
    const { id } = await params;

    // Try updating in User model first
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).lean();

    // If not found in User model, try Buyer model
    const updatedBuyer = !updatedUser
      ? await Buyer.findByIdAndUpdate(id, { status }, { new: true }).lean()
      : null;

    if (!updatedUser && !updatedBuyer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userResult = updatedUser || updatedBuyer;

    if (!userResult) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...userResult,
        id: userResult._id.toString(),
        _id: undefined,
      },
    });
  } catch (error) {
    console.error("Failed to update user status:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 },
    );
  }
}
