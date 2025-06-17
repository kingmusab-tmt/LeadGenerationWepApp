import React from "react";
import ContentVerification from "./content";
import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";

const ContentManagement = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "admin") {
    return <ContentVerification />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default ContentManagement;
