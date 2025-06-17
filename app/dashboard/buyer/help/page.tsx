import HelpSection from "./help";
import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";

const BuyerHelpPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "buyer") {
    return <HelpSection />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default BuyerHelpPage;
