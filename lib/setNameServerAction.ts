"use server";

import { getServerSession } from "next-auth";
import client from "./db";
import { authOptions } from "@/auth";

export const setName = async (name: string) => {
  // Check if the user is authenticated
const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }

  const userId: string | null = session.user?.id;
  if (userId === null) {
    throw new Error("User ID is null");
  }

  // Sanitize input
  const uuidRegExp: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (typeof userId !== "string" || !uuidRegExp.test(userId)) {
    throw new Error("Invalid UUID");
  }
  name = name.trim();

  // Update the user's name in the database
  try {
    const db = client.db("your_database_name"); // Replace with your database name
    const usersCollection = db.collection("users"); // Replace with your collection name

    const result = await usersCollection.updateOne(
      { id: userId }, // Match user by ID
      { $set: { name: name } } // Update the name field
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found");
    }

    return true;
  } catch (error) {
    console.error("Failed to update user name:", error);
    throw new Error("Failed to update user name");
  }
};
