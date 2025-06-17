import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import BuyersPage from "./leadbuyercomponent";

const LeadBuyerManagementPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "seller") {
    return <BuyersPage />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default LeadBuyerManagementPage;
