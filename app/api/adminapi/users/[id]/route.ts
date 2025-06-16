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
    const { status, role } = await req.json();

    if (!status && !role) {
      return NextResponse.json(
        { error: "Either status or role must be provided" },
        { status: 400 }
      );
    }

    // First find the user to check their current role
    const user = await User.findById(params.id).lean();

    let updateData: { status?: string; role?: string } = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;

    let updatedRecord;

    if (user) {
      // If user is a buyer and we're updating role or status
      if (user.role === "buyer") {
        // Update User collection
        const updatedUser = await User.findByIdAndUpdate(
          params.id,
          updateData,
          { new: true }
        ).lean();

        let updatedBuyer = null;
        // Only update Buyer collection if status is changing
        if (status) {
          updatedBuyer = await Buyer.findOneAndUpdate(
            { email: user.email },
            { status },
            { new: true }
          ).lean();
        }

        updatedRecord = updatedUser || updatedBuyer;
      } else {
        // For non-buyer users, just update the User collection
        updatedRecord = await User.findByIdAndUpdate(params.id, updateData, {
          new: true,
        }).lean();
      }
    } else {
      // If not found in User model, try Buyer model directly (status only)
      if (status) {
        updatedRecord = await Buyer.findByIdAndUpdate(
          params.id,
          { status },
          { new: true }
        ).lean();
      }
    }

    if (!updatedRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...updatedRecord,
        id: updatedRecord._id.toString(),
        _id: undefined,
      },
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // First find the user to check their role and get email if buyer
    const user = await User.findById(params.id).lean();

    let deletedRecord;
    let isBuyer = false;

    if (user) {
      isBuyer = user.role === "buyer";

      // Delete from User collection
      deletedRecord = await User.findByIdAndDelete(params.id).lean();

      // If buyer, also delete from Buyer collection using email
      if (isBuyer && user.email) {
        await Buyer.findOneAndDelete({ email: user.email });
      }
    } else {
      // If not found in User model, try Buyer model directly
      deletedRecord = await Buyer.findByIdAndDelete(params.id).lean();
    }

    if (!deletedRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `${isBuyer ? "Buyer" : "User"} deleted successfully`,
      user: {
        ...deletedRecord,
        id: deletedRecord._id.toString(),
        _id: undefined,
      },
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
