import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import TierManagement from "./tier";

const TierManagementPage = () => {
  return <TierManagement />;
};

export default TierManagementPage;
