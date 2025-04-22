import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import UserDashboard from "./layout";

const Dashboard: React.FC = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (
    (isAuthenticated.isAuthenticated === true &&
      isAuthenticated.role === "seller") ||
    isAuthenticated.role === "admin"
  ) {
    return <UserDashboard children={undefined} />;
  } else if (
    isAuthenticated.isAuthenticated === true &&
    isAuthenticated.role === "buyer"
  ) {
    return "You do not have permission to access this page";
  } else {
    redirect("/auth/sign-in");
  }
};

export default Dashboard;
