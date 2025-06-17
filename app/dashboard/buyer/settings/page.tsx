import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import AccountSettings from "./settings";

const SettingPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "buyer") {
    return <AccountSettings />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default SettingPage;
