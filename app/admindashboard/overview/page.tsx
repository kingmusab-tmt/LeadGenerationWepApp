import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import AdminOverview from "./overview";

const OverviewPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "admin") {
    return <AdminOverview />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default OverviewPage;
