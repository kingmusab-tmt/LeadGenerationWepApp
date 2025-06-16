import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import { redirect } from "next/navigation";
import PricingSection from "./plan";

const PlanSelectionPage = async () => {
  const isAuthenticated = await checkIsAuthenticated();

  if (isAuthenticated.isAuthenticated && isAuthenticated.isSubActive) {
    redirect(`/dashboard/${isAuthenticated.role}/overview`);
  } else if (isAuthenticated && !isAuthenticated.isSubActive) {
    return <PricingSection />;
  } else {
    redirect("/auth/sign-in");
  }
};

export default PlanSelectionPage;
