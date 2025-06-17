import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import AssignLeads from "./leadverification";

const LeadVerificationPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "seller") {
    return <AssignLeads />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default LeadVerificationPage;
