// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import {
//   Box,
//   Button,
//   Typography,
//   Container,
//   Paper,
//   Snackbar,
//   Backdrop,
//   Alert,
//   Grid,
//   Avatar,
//   useTheme,
//   CircularProgress,
// } from "@mui/material";
// import LoadingComponent from "../components/generalComponent/loadingcomponent";
// import Image from "next/image";
// import CompanyLogo from "../../public/images/5ae9cfb6c909a_thumb900.png";
// import {
//   CheckCircle,
//   Shield,
//   Handshake,
//   TrendingUp,
// } from "@mui/icons-material";

// type UserRole = "user" | "seller" | "buyer" | "business-admin" | "staff";

// const RoleSelectionPage: React.FC = () => {
//   const [loading, setLoading] = useState(true);
//   const [authChecking, setAuthChecking] = useState(true);
//   const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
//   const [currentUserRole, setCurrentUserRole] = useState<UserRole>("user");
//   const [snackbar, setSnackbar] = useState<{
//     open: boolean;
//     message: string;
//     severity: "success" | "error" | "info" | "warning";
//   }>({
//     open: false,
//     message: "",
//     severity: "info",
//   });

//   const router = useRouter();
//   const theme = useTheme();

//   useEffect(() => {
//     const checkAuthAndRole = async () => {
//       try {
//         const response = await fetch("/api/auth/session");
//         const data = await response.json();

//         if (!response.ok || !data.user) {
//           router.push("/auth/sign-in");
//           return;
//         }

//         setCurrentUserRole(data.user.role || "user");

//         if (data.user.role && data.user.role !== "user") {
//           redirectBasedOnRole(data.user.role);
//         }
//       } catch (error) {
//         console.error("Error checking session:", error);
//         setSnackbar({
//           open: true,
//           message: "Error verifying your session. Please try again.",
//           severity: "error",
//         });
//         router.push("/auth/sign-in");
//       } finally {
//         setAuthChecking(false);
//         setLoading(false);
//       }
//     };

//     checkAuthAndRole();
//   }, [router]);

//   const redirectBasedOnRole = (role: UserRole) => {
//     if (!role || role === "user") return;

//     // Redirect sellers and business-admins to plan selection
//     if (role === "seller" || role === "business-admin") {
//       router.push("/plan");
//       return;
//     }

//     // Redirect other roles to their dashboards
//     const dashboardPaths: Record<string, string> = {
//       buyer: "/dashboard/buyer/overview",
//       staff: "/dashboard/staff/overview",
//     };

//     const path = dashboardPaths[role];
//     if (path) {
//       router.push(path);
//     }
//   };

//   const handleRoleSelection = async (role: Exclude<UserRole, "user">) => {
//     setSelectedRole(role);
//     setLoading(true);
//     try {
//       const response = await fetch("/api/usertype", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ role }),
//       });

//       if (response.ok) {
//         setCurrentUserRole(role);
//         setSnackbar({
//           open: true,
//           message: "Role updated successfully! Redirecting...",
//           severity: "success",
//         });
//         redirectBasedOnRole(role);
//       } else {
//         const errorData = await response.json();
//         setSnackbar({
//           open: true,
//           message:
//             errorData.message || "Failed to update role. Please try again.",
//           severity: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error updating role:", error);
//       setSnackbar({
//         open: true,
//         message: "An error occurred. Please try again.",
//         severity: "error",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const features = [
//     {
//       icon: <Shield color="primary" />,
//       title: "Secure Platform",
//       description: "Bank-level encryption to protect your data",
//     },
//     {
//       icon: <Handshake color="primary" />,
//       title: "Trusted Network",
//       description: "Verified users only",
//     },
//     {
//       icon: <TrendingUp color="primary" />,
//       title: "Growth Focused",
//       description: "Tools to help your business succeed",
//     },
//   ];

//   if (authChecking) {
//     return (
//       <Box
//         sx={{
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           height: "100vh",
//           flexDirection: "column",
//           gap: 2,
//         }}
//       >
//         <CircularProgress size={60} />
//         <Typography variant="h6">Checking your session...</Typography>
//       </Box>
//     );
//   }

//   if (currentUserRole && currentUserRole !== "user") {
//     return (
//       <Box
//         sx={{
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           height: "100vh",
//           flexDirection: "column",
//           gap: 2,
//         }}
//       >
//         <CircularProgress size={60} />
//         <Typography variant="h6">
//           {["seller", "business-admin"].includes(currentUserRole)
//             ? "Redirecting to plan selection..."
//             : `Redirecting to your ${currentUserRole} dashboard...`}
//         </Typography>
//       </Box>
//     );
//   }

//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 100%)`,
//         py: 8,
//       }}
//     >
//       <Container maxWidth="lg">
//         <Box sx={{ textAlign: "center", mb: 4 }}>
//           <Image
//             src={CompanyLogo}
//             alt="Company Logo"
//             width={180}
//             height={60}
//             style={{ objectFit: "contain" }}
//             priority
//           />
//         </Box>

//         <Grid container spacing={4} justifyContent="center">
//           <Grid item xs={12} md={6}>
//             <Paper
//               elevation={6}
//               sx={{
//                 padding: 4,
//                 borderRadius: 3,
//                 background: theme.palette.background.paper,
//               }}
//             >
//               <Typography
//                 variant="h4"
//                 component="h1"
//                 gutterBottom
//                 sx={{ fontWeight: 700, color: theme.palette.primary.main }}
//               >
//                 {currentUserRole === "user"
//                   ? "Complete Your Registration"
//                   : "Update Your Role"}
//               </Typography>
//               <Typography
//                 variant="subtitle1"
//                 color="text.secondary"
//                 gutterBottom
//               >
//                 {currentUserRole === "user"
//                   ? "Please select your role to access the platform"
//                   : "You can update your role to access different features"}
//               </Typography>

//               <Box sx={{ my: 4 }}>
//                 <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
//                   Available Roles
//                 </Typography>
//                 <Typography variant="body1" color="text.secondary" gutterBottom>
//                   Choose how you'll be using our platform:
//                 </Typography>

//                 <Box
//                   sx={{
//                     display: "flex",
//                     flexDirection: "column",
//                     gap: 2,
//                     mt: 3,
//                   }}
//                 >
//                   {[
//                     {
//                       value: "seller",
//                       label: "Lead Seller",
//                       description:
//                         "Connect with qualified buyers (requires plan selection)",
//                     },
//                     {
//                       value: "buyer",
//                       label: "Lead Buyer",
//                       description: "Find quality leads for your business",
//                     },
//                     {
//                       value: "business-admin",
//                       label: "Business Admin",
//                       description:
//                         "Manage your organization's account (requires plan selection)",
//                     },
//                     {
//                       value: "staff",
//                       label: "Staff Member",
//                       description: "Access assigned business tools",
//                     },
//                   ].map((role) => (
//                     <Button
//                       key={role.value}
//                       variant={
//                         selectedRole === role.value ? "contained" : "outlined"
//                       }
//                       color="primary"
//                       size="large"
//                       onClick={() =>
//                         handleRoleSelection(
//                           role.value as Exclude<UserRole, "user">
//                         )
//                       }
//                       disabled={loading}
//                       startIcon={
//                         loading && selectedRole === role.value ? (
//                           <LoadingComponent />
//                         ) : null
//                       }
//                       sx={{
//                         py: 2,
//                         justifyContent: "flex-start",
//                         textAlign: "left",
//                         borderRadius: 2,
//                       }}
//                     >
//                       <Box sx={{ ml: 1 }}>
//                         <Typography
//                           variant="subtitle1"
//                           sx={{ fontWeight: 600 }}
//                         >
//                           {role.label}
//                         </Typography>
//                         <Typography variant="caption" color="text.secondary">
//                           {role.description}
//                         </Typography>
//                       </Box>
//                     </Button>
//                   ))}
//                 </Box>
//               </Box>
//             </Paper>
//           </Grid>

//           <Grid item xs={12} md={6}>
//             <Box
//               sx={{
//                 height: "100%",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "center",
//               }}
//             >
//               <Typography
//                 variant="h5"
//                 gutterBottom
//                 sx={{ fontWeight: 600, mb: 3 }}
//               >
//                 Platform Features
//               </Typography>

//               {features.map((feature, index) => (
//                 <Box key={index} sx={{ display: "flex", mb: 3 }}>
//                   <Avatar
//                     sx={{
//                       bgcolor: theme.palette.primary.light,
//                       mr: 2,
//                       width: 40,
//                       height: 40,
//                     }}
//                   >
//                     {feature.icon}
//                   </Avatar>
//                   <Box>
//                     <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
//                       {feature.title}
//                     </Typography>
//                     <Typography variant="body2" color="text.secondary">
//                       {feature.description}
//                     </Typography>
//                   </Box>
//                 </Box>
//               ))}

//               <Box
//                 sx={{
//                   mt: 4,
//                   p: 3,
//                   backgroundColor: theme.palette.success.light,
//                   borderRadius: 2,
//                   display: "flex",
//                   alignItems: "center",
//                 }}
//               >
//                 <CheckCircle color="success" sx={{ mr: 2, fontSize: "2rem" }} />
//                 <Typography variant="body2">
//                   <strong>Trusted by thousands</strong> of professionals
//                   worldwide
//                 </Typography>
//               </Box>
//             </Box>
//           </Grid>
//         </Grid>
//       </Container>

//       <Snackbar
//         open={snackbar.open}
//         autoHideDuration={5000}
//         onClose={() => setSnackbar({ ...snackbar, open: false })}
//         anchorOrigin={{ vertical: "top", horizontal: "center" }}
//       >
//         <Alert
//           onClose={() => setSnackbar({ ...snackbar, open: false })}
//           severity={snackbar.severity}
//           sx={{ width: "100%" }}
//           variant="filled"
//         >
//           {snackbar.message}
//         </Alert>
//       </Snackbar>

//       <Backdrop
//         sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
//         open={loading}
//       >
//         <Box textAlign="center">
//           <LoadingComponent />
//           <Typography variant="h6" sx={{ mt: 2 }}>
//             {selectedRole
//               ? `Setting up your ${selectedRole} access...`
//               : "Processing..."}
//           </Typography>
//         </Box>
//       </Backdrop>
//     </Box>
//   );
// };

// export default RoleSelectionPage;
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  CircularProgress,
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

type UserRole = "user" | "seller" | "buyer" | "business-admin" | "staff";

const RoleSelectionPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
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
    setSelectedRole(role);
    setLoading(true);
    try {
      const response = await fetch("/api/usertype", {
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
          <Grid item xs={12} md={6}>
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
                          role.value as Exclude<UserRole, "user">
                        )
                      }
                      disabled={loading}
                      startIcon={
                        loading && selectedRole === role.value ? (
                          <LoadingComponent />
                        ) : null
                      }
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

          <Grid item xs={12} md={6}>
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
