import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin, requireSuperAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";
import { badRequest, internalError, notFound } from "@/lib/api/error-handler";

// Must match models/userModel.ts's role enum.
const VALID_ROLES = [
  "admin",
  "seller",
  "buyer",
  "user",
  "staff",
  "business-admin",
];

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
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const { id } = await params;
    const { status, role, adminLevel } = await req.json();

    if (!status && !role && !adminLevel) {
      return badRequest("Either status, role, or adminLevel must be provided");
    }

    // Changing another admin's level is itself a super-admin-only action —
    // otherwise a standard admin could just promote themselves back.
    if (adminLevel) {
      const { error: superError } = await requireSuperAdmin();
      if (superError) return superError;
      if (adminLevel !== "standard" && adminLevel !== "super") {
        return badRequest('adminLevel must be "standard" or "super"');
      }
    }

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return badRequest(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
      }
      // Promoting someone to "admin" is the same class of action as raising
      // adminLevel above — it grants full base admin capabilities — so it
      // gets the same super-admin-only gate. Without this, a standard admin
      // could set any user's role straight to "admin" and sidestep the
      // adminLevel check entirely.
      if (role === "admin") {
        const { error: superError } = await requireSuperAdmin();
        if (superError) return superError;
      }
    }

    // First find the user to check their current role
    const user = await User.findById(id).lean();

    const updateData: { status?: string; role?: string; adminLevel?: string } =
      {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (adminLevel) updateData.adminLevel = adminLevel;

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

    await recordAuditLog({
      actor: {
        email: session!.user.email,
        name: session!.user.name,
        role: session!.user.role,
      },
      action: "user.update",
      targetType: "User",
      targetId: id,
      summary: `Updated ${Object.keys(updateData).join(", ")} for ${(updatedRecord as { email?: string }).email || id}`,
      metadata: updateData,
      req,
    });

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

// Permanent deletion — requires super-admin rather than the standard
// admin check used for status/role updates above.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, actor } = await requireSuperAdmin();
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

    await recordAuditLog({
      actor: actor!,
      action: "user.delete",
      targetType: isBuyer ? "Buyer" : "User",
      targetId: id,
      summary: `Deleted ${isBuyer ? "buyer" : "user"} ${(deletedRecord as { email?: string }).email || id}`,
      metadata: { email: (deletedRecord as { email?: string }).email },
      req,
    });

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
