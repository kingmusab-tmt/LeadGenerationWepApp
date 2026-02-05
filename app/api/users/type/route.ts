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

      // If role is "buyer", create a Buyer profile if it doesn't exist
      if (result.role === "buyer") {
        const existingBuyer = await Buyer.findOne({
          email: session.user.email,
        });
        if (!existingBuyer) {
          console.log(
            "[UserType API] Creating Buyer profile for:",
            session.user.email,
          );
          const newBuyer = new Buyer({
            name: result.name || "New Buyer",
            email: session.user.email,
            // registeredWith is optional - null for independent buyers
            registeredWith: null,
            isIndependentBuyer: true, // Independent registration
            // All other fields will use schema defaults
          });
          await newBuyer.save();
          console.log("[UserType API] Buyer profile created successfully");
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
