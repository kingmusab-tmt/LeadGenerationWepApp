"use client";

import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  CssBaseline,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import {
  Dashboard,
  Settings,
  HelpOutline,
  Menu as MenuIcon,
  Storefront,
  ReceiptLong,
  LocalAtm,
  CallReceivedRounded,
  People,
  Notifications,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { handleSignOut } from "@/lib/signOutServerAction";
import { useInitializeUser } from "@/app/hooks";
import DarkModeToggle from "@/app/components/generalComponent/darkmodetoggle";
import NotificationBell from "@/app/components/generalComponent/NotificationBell";
import InactivityLogout from "@/app/components/generalComponent/InactivityLogout";
import {
  hydrateBuyerOnboardingFromServer,
  isBuyerOnboardingFlowComplete,
} from "@/lib/buyerOnboarding";

interface UserDashboardProps {
  children: React.ReactNode;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ children }) => {
  const { currentUser, loading: userLoading } = useInitializeUser();
  const { status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "loading" || userLoading) return;
    if (status === "unauthenticated" && !currentUser) {
      router.replace("/auth/sign-in");
    }
  }, [status, userLoading, currentUser, router]);

  // Onboarding progress used to live only in this browser's localStorage —
  // pull the server's copy in before the gating check below runs, so a new
  // device/browser (or cleared storage) sees real progress instead of
  // looking like onboarding was never started.
  const [onboardingHydrated, setOnboardingHydrated] = useState(false);
  useEffect(() => {
    if (!currentUser?.email) return;
    let cancelled = false;
    hydrateBuyerOnboardingFromServer(currentUser.email).finally(() => {
      if (!cancelled) setOnboardingHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  useEffect(() => {
    if (status === "loading" || userLoading || !currentUser) return;

    const isBuyerRole =
      currentUser.role === "buyer" || currentUser.role === "staff";

    if (!isBuyerRole) {
      if (currentUser.role === "admin") {
        router.replace("/admindashboard/overview");
      } else if (
        currentUser.role === "seller" ||
        currentUser.role === "business-admin"
      ) {
        router.replace("/dashboard/seller/overview");
      } else {
        router.replace("/completeregistration");
      }
      return;
    }

    if (!onboardingHydrated) return;

    const onboardingFlowComplete = isBuyerOnboardingFlowComplete(
      currentUser.email,
    );

    // Always enforce onboarding for buyer dashboard pages unless onboarding
    // is complete (the onboarding page itself lives outside this layout at /buyer-onboarding)
    if (!onboardingFlowComplete) {
      router.replace("/buyer-onboarding");
    }
  }, [status, userLoading, currentUser, router, onboardingHydrated]);

  const avatarSrc = currentUser?.image || "";
  const displayName = currentUser?.name || "User";

  const handleNavigation = (path: string) => {
    setLoading(true);
    try {
      router.push(`/dashboard/buyer/${path}`, { scroll: false });
    } finally {
      setLoading(false);
    }
  };

  const onSignOut = async () => {
    setLoading(true);
    try {
      await handleSignOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // const subMenuOpen = Boolean(subMenuAnchorEl);

  if (status === "loading" || userLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <CssBaseline />
      <InactivityLogout />
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleMenu}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {currentUser?.role === "staff" ? "Sales Team" : "Buyer"} Dashboard
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DarkModeToggle />
            <NotificationBell
              onClick={() => handleNavigation("notifications")}
            />
            <Avatar
              src={avatarSrc}
              alt={`${displayName}'s profile picture`}
              onClick={handleMenuOpen}
              role="button"
              tabIndex={0}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              sx={{ cursor: "pointer" }}
            />
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleNavigation("settings")}>
                Settings
              </MenuItem>
              <MenuItem onClick={() => onSignOut()}>
                {loading ? (
                  <CircularProgress size={24} style={{ color: "white" }} />
                ) : (
                  loading || "Sign Out"
                )}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={menuOpen}
        onClose={toggleMenu}
        sx={{
          width: menuOpen ? 240 : 60,
          [`& .MuiDrawer-paper`]: {
            width: menuOpen ? 240 : 60,
            boxSizing: "border-box",
            transition: "width 0.3s",
            mt: 8,
            backgroundColor: "white",
          },
        }}
      >
        <List>
          <ListItem
            component="button"
            onClick={() => handleNavigation("overview")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Overview" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Dashboard />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Overview" />
          </ListItem>
          {currentUser?.preferredDistribution !== "Automatic" && (
            <ListItem
              component="button"
              onClick={() => handleNavigation("marketplace")}
              sx={{
                color: "blue",
                backgroundColor: "white",
                border: "none",
                "&:hover": {
                  backgroundColor: "blue",
                  color: "white",
                  "& .MuiListItemIcon-root": {
                    color: "white",
                  },
                },
              }}
            >
              <Tooltip title="Market Place" placement="right">
                <ListItemIcon sx={{ color: "blue" }}>
                  <Storefront />
                </ListItemIcon>
              </Tooltip>
              <ListItemText primary="Market Place" />
            </ListItem>
          )}
          <ListItem
            component="button"
            onClick={() => handleNavigation("myassignedleads")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Assigned Leads" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <People />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Assigned Leads" />
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("callhistory")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Call History" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <CallReceivedRounded />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Call History" />
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("transactions")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Transactions" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <ReceiptLong />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Transactions" />
          </ListItem>

          <ListItem
            component="button"
            onClick={() => handleNavigation("notifications")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Notifications" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Notifications />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Notifications" />
          </ListItem>

          <ListItem
            component="button"
            onClick={() => handleNavigation("purchaseUnit")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Purchase Units" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <LocalAtm />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Purchase Units" />
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("help")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Help" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <HelpOutline />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Help" />
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("settings")}
            sx={{
              color: "blue",
              backgroundColor: "white",
              border: "none",
              "&:hover": {
                backgroundColor: "blue",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <Tooltip title="Settings" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Settings />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Settings" />
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, mt: 3 }}>
        {children}
      </Box>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default UserDashboard;
