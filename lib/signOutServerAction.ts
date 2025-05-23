"use client";

import { signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";

export const handleSignOut = async () => {
  // const router = useRouter();
  try {
    await signOut();
    // router.push("/auth/sign-in");
  } catch (error) {
    throw error;
  }
};
