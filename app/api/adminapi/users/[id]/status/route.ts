import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { Buyer } from "@/models/leadbuyers";

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
};

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { status } = await req.json();

    // Try updating in User model first
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      { status },
      { new: true }
    ).lean();

    // If not found in User model, try Buyer model
    const updatedBuyer = !updatedUser
      ? await Buyer.findByIdAndUpdate(
          params.id,
          { status },
          { new: true }
        ).lean()
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
      { status: 500 }
    );
  }
}
