import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";
import { internalError, notFound } from "@/lib/api/error-handler";

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
      return notFound("User");
    }

    const userResult = updatedUser || updatedBuyer;

    if (!userResult) {
      return notFound("User");
    }

    let userSchemaDates: {
      createdAt: string | null;
      lastLogin: string | null;
    } = {
      createdAt: toIsoDateOrNull(
        (userResult as { createdAt?: unknown }).createdAt,
      ),
      lastLogin: toIsoDateOrNull(
        (userResult as { lastLogin?: unknown }).lastLogin,
      ),
    };

    if (!updatedUser && updatedBuyer?.email) {
      const linkedUser = await User.findOne({ email: updatedBuyer.email })
        .select("createdAt lastLogin")
        .lean();

      if (linkedUser) {
        userSchemaDates = {
          createdAt: toIsoDateOrNull(linkedUser.createdAt),
          lastLogin: toIsoDateOrNull(linkedUser.lastLogin),
        };
      }
    }

    await recordAuditLog({
      actor: {
        email: session!.user.email,
        name: session!.user.name,
        role: session!.user.role,
      },
      action: "user.status.update",
      targetType: updatedUser ? "User" : "Buyer",
      targetId: id,
      summary: `Set status to "${status}" for ${userResult.email || id}`,
      metadata: { status },
      req,
    });

    return NextResponse.json({
      user: {
        ...userResult,
        id: userResult._id.toString(),
        _id: undefined,
        createdAt: userSchemaDates.createdAt,
        lastLogin: userSchemaDates.lastLogin,
      },
    });
  } catch (error) {
    console.error("Failed to update user status:", error);
    return internalError("Failed to update user status");
  }
}
