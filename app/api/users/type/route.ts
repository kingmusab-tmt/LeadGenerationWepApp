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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
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
      return NextResponse.json(
        { message: "User not found or role not updated" },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { message: "Internal server error", error: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ message: "User not found" }, { status: 404 });
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
    return NextResponse.json(
      { message: "Internal server error", error: String(error) },
      { status: 500 },
    );
  }
}
