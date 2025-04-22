"use client";

import { signIn } from "next-auth/react";

export const handleEmailSignIn = async (email: string) => {
  try {
    await signIn("nodemailer", { email, callbackUrl: "/auth/sign-in" });
  } catch (error) {
    throw error;
  }
};
