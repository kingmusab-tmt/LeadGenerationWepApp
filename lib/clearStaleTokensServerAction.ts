"use server";

import client from "./db";
// import dynamic from 'next/dynamic';

export const clearStaleTokens = async () => {
  try {
    const db = client.db("VTUAPP");
    const verificationTokenCollection = db.collection("verification_token");

    // Delete all tokens where the expiration date is in the past
    const result = await verificationTokenCollection.deleteMany({
      expires: { $lt: new Date() },
    });

    console.log(`${result.deletedCount} stale tokens cleared.`);
  } catch (error) {
    console.error("Failed to clear stale tokens:", error);
    throw error;
  }
};
