import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import { Typography } from "@mui/material";
import AdminDashboard from "./layout";

const Admin: React.FC = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.role === "admin") {
    return <AdminDashboard children={undefined} />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default Admin;
