"use server";

import client from "./db"; // Assuming 'client' is a MongoDB client
import { getServerSession } from "next-auth";

// Get the role from the MongoDB database based on the UUID in the users collection
export const getUserRole = async () => {
  const session = await getServerSession();
  if (session?.user?.role) {
    console.log(session.user.role)
    return session.user.role;
  }
  // if (session) {
  // const uuid = session.user?.id;
    

  // // Sanitize input
  // const uuidRegExp: RegExp =
  //   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  // if (typeof uuid !== "string" || !uuidRegExp.test(uuid)) {
  //   throw new Error("Invalid UUID");
  // }

  // // Connect to the MongoDB database
  // const db = client.db("vutapp");
  // const usersCollection = db.collection("users");

  // // Query the database to find the user's role
  // const user = await usersCollection.findOne({ id: uuid }, { projection: { role: 1 } });

  // if (!user) {
  //   throw new Error("User not found");
  // }

  // return user.role;
};
