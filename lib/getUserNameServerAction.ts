"use server";

import { getServerSession } from "next-auth";

export const getUserName = async () => {
  const session = await getServerSession();
  if (session) {
    return session.user?.name;
  }
};