import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import CallHistory from "./callhistory";

const CallHistoryPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "buyer") {
    return <CallHistory />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default CallHistoryPage;
