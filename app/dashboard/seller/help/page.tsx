import HelpSection from "./helpcomponent";
import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";

const HelpPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "seller") {
    return <HelpSection />;
  } else {
    <Typography>You Don't have access to this resource</Typography>;
    redirect("/auth/sign-in");
  }
};

export default HelpPage;
