import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import HelpManagement from "./help";

const HelpManagementPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "admin") {
    return <HelpManagement />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default HelpManagementPage;
