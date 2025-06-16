import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import TierManagement from "./tier";

const TierManagementPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "admin") {
    return <TierManagement />;
  } else {
    <Typography>You Don't have access to this resource</Typography>;
    redirect("/auth/sign-in");
  }
};

export default TierManagementPage;
