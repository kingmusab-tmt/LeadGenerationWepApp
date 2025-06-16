"use client";
import React, { useState, useEffect } from "react";
import UserDashboard from "../layout";
import CallPage from "./selltertwiliosetup";
import { useSession } from "next-auth/react";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

const CallTrackingSetting = () => {
  const { data: session, status } = useSession();
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      setSellerId(session.user.id);
      setLoading(false);
    } else if (status === "unauthenticated" || status === "loading") {
      setLoading(true);
    }
  }, [session, status]);

  if (loading) {
    return (
      <UserDashboard>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <LoadingComponent />
        </div>
      </UserDashboard>
    );
  }

  if (!sellerId) {
    return (
      <UserDashboard>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <p>Seller ID not found. Please log in again.</p>
        </div>
      </UserDashboard>
    );
  }

  return (
    <UserDashboard>
      <CallPage sellerId={sellerId} />
      {/* <LeadTracking sellerId={sellerId} /> */}
    </UserDashboard>
  );
};

export default CallTrackingSetting;
