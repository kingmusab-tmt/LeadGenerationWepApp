import { getUserRole } from "@/lib/getUserRoleServerAction";
import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import AdminDashboard from "./admin";
import { Typography } from "@mui/material";

const Admin: React.FC = async () => {
  const role = await getUserRole();
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated && role === "admin") {
    return <AdminDashboard />;
  } else {
    <Typography>You Don't have access to this resource</Typography>;
    redirect("/auth/sign-in");
  }
};

export default Admin;
