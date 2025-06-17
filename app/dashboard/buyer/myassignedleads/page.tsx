import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import AssignedLeads from "./myassignedleads";

const MyAssignLeadPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "buyer") {
    return <AssignedLeads />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default MyAssignLeadPage;
