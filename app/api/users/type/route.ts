import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { authOptions } from "@/auth";
import { User } from "@/models";
import {
  invalidateSessionCache,
  invalidateAllUserSessions,
} from "@/lib/cachedSession";
import { Buyer } from "@/models/leadbuyers";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

type SellerContact = {
  id: string;
  name: string;
  businessName?: string;
  email: string;
};

const getLeadSellerContacts = async (): Promise<SellerContact[]> => {
  const sellers = await User.find({
    role: { $in: ["seller", "business-admin"] },
    status: "active",
  })
    .select("_id name businessName email")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return sellers
    .filter((seller) => Boolean(seller.email))
    .map((seller) => ({
      id: seller._id.toString(),
      name: seller.name || "Lead Seller",
      businessName: seller.businessName || "",
      email: seller.email,
    }));
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }

  try {
    await dbConnect();
    const { role } = await req.json();

    if (
      role !== "seller" &&
      role !== "buyer" &&
      role !== "business-admin" &&
      role !== "staff"
    ) {
      return badRequest("Invalid role");
    }

    const actor = session.user.id
      ? await User.findById(session.user.id).select("_id role email")
      : await User.findOne({ email: session.user.email })
          .select("_id role email")
          .lean();

    if (!actor) {
      return notFound("User");
    }

    // "business-admin" is a self-service signup choice (same tier as
    // "seller"). "staff" is not self-service — it's meant to be assigned
    // once a business-admin adds someone as staff, the same way "buyer" is
    // meant to only apply after a seller pre-registers them (see the
    // BUYER_PRE_REG_REQUIRED check below). Unlike buyer, there's currently
    // no auto-assignment path for staff (auth.ts only auto-promotes
    // "user" -> "buyer" on sign-in) — until that exists, only a platform
    // admin can grant the "staff" role.
    const isPrivilegedTargetRole = role === "staff";
    if (isPrivilegedTargetRole && actor.role !== "admin") {
      return forbidden("Only admins can assign privileged roles");
    }

    // Log the session info for debugging
    console.log("[UserType API] Session user info:", {
      id: session.user.id,
      email: session.user.email,
    });

    // Try to find and update by ID first, fallback to email
    let result = null;
    if (session.user.id) {
      result = await User.findByIdAndUpdate(
        session.user.id,
        { role },
        { new: true },
      );
    }

    // If ID didn't work, try email
    if (!result && session.user.email) {
      console.log("[UserType API] Trying update by email:", session.user.email);
      result = await User.findOneAndUpdate(
        { email: session.user.email },
        { role },
        { new: true },
      );
    }

    if (result) {
      console.log(
        "[UserType API] Role updated successfully for:",
        session.user.email,
        "new role:",
        result.role,
      );

      // If role is "buyer", require pre-registration in Buyer schema by email
      if (result.role === "buyer") {
        const existingBuyer = await Buyer.findOne({
          email: session.user.email,
        }).select("_id");

        if (!existingBuyer) {
          // Revert role back to base role if buyer pre-registration is missing
          await User.updateOne({ _id: result._id }, { $set: { role: "user" } });

          const sellers = await getLeadSellerContacts();

          return NextResponse.json(
            {
              message:
                "You must be registered first by a lead seller before using the platform as a buyer.",
              code: "BUYER_PRE_REG_REQUIRED",
              sellers,
            },
            { status: 403 },
          );
        }
      }

      // Invalidate session cache so the new role is fetched on next request
      await invalidateSessionCache(session.user.email);
      // Also invalidate all sessions for this user ID
      await invalidateAllUserSessions(session.user.id);

      return NextResponse.json(
        { message: "Role updated successfully", role: result.role },
        { status: 200 },
      );
    } else {
      console.log(
        "[UserType API] User not found for id:",
        session.user.id,
        "email:",
        session.user.email,
      );
      return notFound("User", "User not found or role not updated");
    }
  } catch (error) {
    console.error("Error updating role:", error);
    return internalError(
      error instanceof Error
        ? `Internal server error: ${error.message}`
        : "Internal server error",
    );
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }

  try {
    await dbConnect();

    let deletedUser = null;
    if (session.user.id) {
      deletedUser = await User.findByIdAndDelete(session.user.id);
    }

    if (!deletedUser && session.user.email) {
      deletedUser = await User.findOneAndDelete({ email: session.user.email });
    }

    if (!deletedUser) {
      return notFound("User");
    }

    if (session.user.email) {
      await invalidateSessionCache(session.user.email);
    }
    if (session.user.id) {
      await invalidateAllUserSessions(session.user.id);
    }

    return NextResponse.json({
      message: "Registration cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    return internalError(
      error instanceof Error
        ? `Internal server error: ${error.message}`
        : "Internal server error",
    );
  }
}
