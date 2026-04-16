import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { badRequest, internalError, notFound } from "@/lib/api/error-handler";

const toIsoDateOrNull = (value: unknown): string | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const { id } = await params;
    const { status, role } = await req.json();

    if (!status && !role) {
      return badRequest("Either status or role must be provided");
    }

    // First find the user to check their current role
    const user = await User.findById(id).lean();

    const updateData: { status?: string; role?: string } = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;

    let updatedRecord;

    if (user) {
      // If user is a buyer and we're updating role or status
      if (user.role === "buyer") {
        // Update User collection
        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
          new: true,
        }).lean();

        let updatedBuyer = null;
        // Only update Buyer collection if status is changing
        if (status) {
          updatedBuyer = await Buyer.findOneAndUpdate(
            { email: user.email },
            { status },
            { new: true },
          ).lean();
        }

        updatedRecord = updatedUser || updatedBuyer;
      } else {
        // For non-buyer users, just update the User collection
        updatedRecord = await User.findByIdAndUpdate(id, updateData, {
          new: true,
        }).lean();
      }
    } else {
      // If not found in User model, try Buyer model directly (status only)
      if (status) {
        updatedRecord = await Buyer.findByIdAndUpdate(
          id,
          { status },
          { new: true },
        ).lean();
      }
    }

    if (!updatedRecord) {
      return notFound("User");
    }

    let userSchemaDates: {
      createdAt: string | null;
      lastLogin: string | null;
    } = {
      createdAt: toIsoDateOrNull(
        (updatedRecord as { createdAt?: unknown }).createdAt,
      ),
      lastLogin: toIsoDateOrNull(
        (updatedRecord as { lastLogin?: unknown }).lastLogin,
      ),
    };

    if (!user && (updatedRecord as { email?: string }).email) {
      const linkedUser = await User.findOne({
        email: (updatedRecord as { email?: string }).email,
      })
        .select("createdAt lastLogin")
        .lean();

      if (linkedUser) {
        userSchemaDates = {
          createdAt: toIsoDateOrNull(linkedUser.createdAt),
          lastLogin: toIsoDateOrNull(linkedUser.lastLogin),
        };
      }
    }

    return NextResponse.json({
      user: {
        ...updatedRecord,
        id: updatedRecord._id.toString(),
        _id: undefined,
        createdAt: userSchemaDates.createdAt,
        lastLogin: userSchemaDates.lastLogin,
      },
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return internalError("Failed to update user");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const { id } = await params;

    // First find the user to check their role and get email if buyer
    const user = await User.findById(id).lean();

    let deletedRecord;
    let isBuyer = false;

    if (user) {
      isBuyer = user.role === "buyer";

      // Delete from User collection
      deletedRecord = await User.findByIdAndDelete(id).lean();

      // If buyer, also delete from Buyer collection using email
      if (isBuyer && user.email) {
        await Buyer.findOneAndDelete({ email: user.email });
      }
    } else {
      // If not found in User model, try Buyer model directly
      deletedRecord = await Buyer.findByIdAndDelete(id).lean();
    }

    if (!deletedRecord) {
      return notFound("User");
    }

    return NextResponse.json({
      message: `${isBuyer ? "Buyer" : "User"} deleted successfully`,
      user: {
        ...deletedRecord,
        id: deletedRecord._id.toString(),
        _id: undefined,
        createdAt: toIsoDateOrNull(
          (deletedRecord as { createdAt?: unknown }).createdAt,
        ),
        lastLogin: toIsoDateOrNull(
          (deletedRecord as { lastLogin?: unknown }).lastLogin,
        ),
      },
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return internalError("Failed to delete user");
  }
}
