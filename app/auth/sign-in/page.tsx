"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage } from "./signin";
import RoleSelectionPage from "@/app/completeregistration/page";
import { checkIsAuthenticated } from "@/lib/checkIsAuthenticated";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

const SignIn: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSubActive, setIsSubActive] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { isAuthenticated, role, isSubActive } =
        await checkIsAuthenticated();
      setIsAuthenticated(isAuthenticated);
      setUserRole(role);
      setIsSubActive(isSubActive ?? false);

      if (isAuthenticated) {
        if (role === "admin") {
          // Redirect to admin dashboard
          router.push("/admindashboard");
        } else if (role === "user" && isSubActive === false) {
          // Redirect to RoleSelectionPage if role is "user"
          router.push("/completeregistration");
        } else if (
          (role === "buyer" ||
            role === "staff" ||
            role === "seller" ||
            role === "business-admin") &&
          isSubActive === false
        ) {
          // Redirect to subscription page if subscription is inactive
          router.push("/plan");
        } else if (
          (role === "buyer" ||
            role === "staff" ||
            role === "seller" ||
            role === "business-admin") &&
          isSubActive === false
        ) {
          // Redirect to the respective dashboard based on role
          router.push(`/dashboard/${role}/overview`);
        }
      }
    };
    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    // Show a loading state while checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingComponent />
      </div>
    );
  }

  if (isAuthenticated && userRole === "user") {
    return <RoleSelectionPage />;
  }

  return <SignInPage />;
};

export default SignIn;
