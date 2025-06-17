import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import TransactionHistory from "./transactions";

const TransactionPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "buyer") {
    return <TransactionHistory />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default TransactionPage;
