"use server";

import { getServerSession } from "next-auth";
import client from "./db";

export const getAccountLinkStatus = async () => {
  // Check if the user is authenticated
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const uuid: string = session.user?.id ?? "";

  // Sanitize input
  const uuidRegExp: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (typeof uuid !== "string" || !uuidRegExp.test(uuid)) {
    throw new Error("Invalid UUID");
  }

  // Check if the user has a Google account linked in MongoDB
  try {
    const db = client.db("yourDatabaseName");
    const accountsCollection = db.collection("accounts");

    const accountExists = await accountsCollection.findOne({
      provider: "google",
      userId: uuid,
    });

    // If no matching account is found, return false
    if (!accountExists) {
      return false;
    }
  } catch (error) {
    console.error("Failed to check if user has Google account linked:", error);
    throw new Error("Database query failed");
  }

  return true;
};
