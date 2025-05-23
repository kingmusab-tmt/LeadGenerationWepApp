"use server";

import client from "./db"; // Assuming 'client' is a MongoDB client
import { getServerSession } from "next-auth";

// Get the role from the MongoDB database based on the UUID in the users collection
export const getUserRole = async () => {
  const session = await getServerSession();
  if (session?.user?.role) {
    console.log(session.user.role);
    return session.user.role;
  }
};
