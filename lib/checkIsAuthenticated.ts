"use server";

import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import dbConnect from "./connectdb";
import { User } from "@/models/user";

export const checkIsAuthenticated = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return { isAuthenticated: false, role: null };
  }
  await dbConnect();
  const user = await User.findOne({
    _id: session.user.id,
  });
  return {
    isAuthenticated: true,
    role: user?.role || "user",
    isSubActive: user?.subscription?.isSubscriptionActive,
    subType: user?.subscription?.subscriptionPlan,
  }; // Default to "user" if role is not set
};
