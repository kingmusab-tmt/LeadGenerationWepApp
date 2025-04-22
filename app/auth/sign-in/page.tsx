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
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { isAuthenticated, role } = await checkIsAuthenticated();
      setIsAuthenticated(isAuthenticated);
      setUserRole(role);

      if (isAuthenticated) {
        if (role === "user") {
          // Redirect to RoleSelectionPage if role is "user"
          router.push("/completeregistration");
        } else if (
          role === "seller" ||
          role === "buyer" ||
          role === "admin" ||
          role === "business-admin" ||
          role === "staff"
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
      <div>
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
