"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Snackbar,
  Backdrop,
  Alert,
  Grid,
  Avatar,
  useTheme,
} from "@mui/material";
import LoadingComponent from "../components/generalComponent/loadingcomponent";
import Image from "next/image";
import CompanyLogo from "../../public/images/5ae9cfb6c909a_thumb900.png";
import {
  CheckCircle,
  Shield,
  Handshake,
  TrendingUp,
} from "@mui/icons-material";
import { useCSRF, useCSRFFetch } from "@/app/hooks/useCSRF";

type UserRole = "user" | "seller" | "buyer" | "business-admin" | "staff";

const RoleSelectionPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const router = useRouter();
  const theme = useTheme();
  const { csrfToken, loading: csrfLoading, refreshToken } = useCSRF();
  const fetchWithCSRF = useCSRFFetch();
  const { data: session, status, update: updateSession } = useSession();

  // Check if user already has a role - redirect them to the right place
  useEffect(() => {
    if (status === "loading" || isRedirecting) return;

    const role = session?.user?.role;
    const isSubActive = session?.user?.isSubActive;

    // If user already has a role set (not "user"), redirect them
    if (role && role !== "user") {
      console.log(
        "[CompleteRegistration] User already has role:",
        role,
        "- redirecting",
      );
      setIsRedirecting(true);

      if (role === "admin") {
        router.replace("/admindashboard/overview");
      } else if (
        (role === "seller" || role === "business-admin") &&
        isSubActive
      ) {
        router.replace("/dashboard/seller/overview");
      } else if (role === "seller" || role === "business-admin") {
        router.replace("/plan");
      } else if (role === "buyer" || role === "staff") {
        router.replace("/dashboard/buyer/overview");
      }
    }
  }, [session, status, router, isRedirecting]);

  const redirectBasedOnRole = (role: UserRole) => {
    if (!role || role === "user") return;

    // Redirect sellers and business-admins to plan selection
    if (role === "seller" || role === "business-admin") {
      router.push("/plan");
      return;
    }

    // Redirect other roles to their dashboards
    const dashboardPaths: Record<string, string> = {
      buyer: "/dashboard/buyer/overview",
      staff: "/dashboard/staff/overview",
    };

    const path = dashboardPaths[role];
    if (path) {
      router.push(path);
    }
  };

  const handleRoleSelection = async (role: Exclude<UserRole, "user">) => {
    // Ensure we have a CSRF token before sending the request
    if (!csrfToken && !csrfLoading) {
      await refreshToken();
    }

    setSelectedRole(role);
    setLoading(true);
    try {
      const response = await fetchWithCSRF("/api/users/type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Role updated successfully! Redirecting...",
          severity: "success",
        });

        // Force session refresh to update JWT token with new role
        // This ensures the proxy sees the updated token immediately
        console.log(
          "[CompleteRegistration] Role updated, refreshing session...",
        );
        await updateSession();

        // Small delay to ensure session propagates before redirect
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log(
          "[CompleteRegistration] Session refreshed, redirecting based on role:",
          role,
        );
        redirectBasedOnRole(role);
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message:
            errorData.message || "Failed to update role. Please try again.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error updating role:", error);
      setSnackbar({
        open: true,
        message: "An error occurred. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Shield color="primary" />,
      title: "Secure Platform",
      description: "Bank-level encryption to protect your data",
    },
    {
      icon: <Handshake color="primary" />,
      title: "Trusted Network",
      description: "Verified users only",
    },
    {
      icon: <TrendingUp color="primary" />,
      title: "Growth Focused",
      description: "Tools to help your business succeed",
    },
  ];

  // Show loading while session is loading or while redirecting
  if (status === "loading" || isRedirecting) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <LoadingComponent />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 100%)`,
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Image
            src={CompanyLogo}
            alt="Company Logo"
            width={180}
            height={60}
            style={{ objectFit: "contain" }}
            priority
          />
        </Box>

        <Grid container spacing={4} justifyContent="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={6}
              sx={{
                padding: 4,
                borderRadius: 3,
                background: theme.palette.background.paper,
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{ fontWeight: 700, color: theme.palette.primary.main }}
              >
                Complete Your Registration
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                gutterBottom
              >
                Please select your role to access the platform
              </Typography>

              <Box sx={{ my: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Available Roles
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Choose how you'll be using our platform:
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mt: 3,
                  }}
                >
                  {[
                    {
                      value: "seller",
                      label: "Lead Seller",
                      description:
                        "Connect with qualified buyers (requires plan selection)",
                    },
                    {
                      value: "buyer",
                      label: "Lead Buyer",
                      description: "Find quality leads for your business",
                    },
                    {
                      value: "business-admin",
                      label: "Business Admin",
                      description:
                        "Manage your organization's account (requires plan selection)",
                    },
                    {
                      value: "staff",
                      label: "Staff Member",
                      description: "Access assigned business tools",
                    },
                  ].map((role) => (
                    <Button
                      key={role.value}
                      variant={
                        selectedRole === role.value ? "contained" : "outlined"
                      }
                      color="primary"
                      size="large"
                      onClick={() =>
                        handleRoleSelection(
                          role.value as Exclude<UserRole, "user">,
                        )
                      }
                      disabled={loading}
                      sx={{
                        py: 2,
                        justifyContent: "flex-start",
                        textAlign: "left",
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ ml: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}
                        >
                          {role.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: 600, mb: 3 }}
              >
                Platform Features
              </Typography>

              {features.map((feature, index) => (
                <Box key={index} sx={{ display: "flex", mb: 3 }}>
                  <Avatar
                    sx={{
                      bgcolor: theme.palette.primary.light,
                      mr: 2,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Box>
                </Box>
              ))}

              <Box
                sx={{
                  mt: 4,
                  p: 3,
                  backgroundColor: theme.palette.success.light,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <CheckCircle color="success" sx={{ mr: 2, fontSize: "2rem" }} />
                <Typography variant="body2">
                  <strong>Trusted by thousands</strong> of professionals
                  worldwide
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <Box textAlign="center">
          <LoadingComponent />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {selectedRole
              ? `Setting up your ${selectedRole} access...`
              : "Processing..."}
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  );
};

export default RoleSelectionPage;
