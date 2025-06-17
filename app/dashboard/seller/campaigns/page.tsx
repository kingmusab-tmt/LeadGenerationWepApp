import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import CampaignManagement from "./campagincomponent";

const CampaignPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "seller") {
    return <CampaignManagement />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default CampaignPage;
