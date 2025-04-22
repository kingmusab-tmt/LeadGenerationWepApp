"use server";

import { getServerSession } from "next-auth";
import client from "./db";

// Deletes the user's Google account record from the database
export const unlinkGoogleAccount = async () => {
  // Check if the user is authenticated
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const userId: string | null = session.user?.id;
  if (!userId) {
    throw new Error("User ID is null");
  }

  // Sanitize input
  const uuidRegExp: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (typeof userId !== "string" || !uuidRegExp.test(userId)) {
    throw new Error("Invalid UUID");
  }

  // Remove the Google account from the database
  try {
    const db = client.db("your_database_name"); // Replace with your database name
    const accountsCollection = db.collection("accounts"); // Replace with your collection name

    const result = await accountsCollection.deleteOne({
      provider: "google",
      userId: userId,
    });

    if (result.deletedCount === 0) {
      throw new Error("No matching Google account found to unlink");
    }

    return true;
  } catch (error) {
    console.error("Failed to unlink Google account:", error);
    throw new Error("Failed to unlink Google account");
  }
};
