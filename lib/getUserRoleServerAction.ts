"use server";

import { getServerSession } from "next-auth";

// Get the role from the MongoDB database based on the UUID in the users collection
export const getUserRole = async () => {
  const session = await getServerSession();
  if (session?.user?.role) {
    //(session.user.role);
    return session.user.role;
  }
};
