"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";

export const setName = async (name: string) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const trimmedName = String(name || "").trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new Error("Name must be between 2 and 100 characters");
  }

  // Reject control characters to avoid malformed profile data
  if (/[\x00-\x1F\x7F]/.test(trimmedName)) {
    throw new Error("Name contains invalid characters");
  }

  try {
    await dbConnect();

    const result = await User.updateOne(
      { _id: session.user.id },
      { $set: { name: trimmedName } },
      { runValidators: true },
    );

    if (!result.matchedCount) {
      throw new Error("User not found");
    }

    return true;
  } catch (error) {
    console.error("Failed to update user name:", error);
    throw new Error("Failed to update user name");
  }
};
