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
  Receipt,
  Storefront,
  SettingsPhone,
  ReceiptLong,
  LocalAtm,
  CallMade,
  CallReceivedRounded,
  People,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { handleSignOut } from "@/lib/signOutServerAction";
import { useInitializeUser } from "@/lib/hooks";
import { isBuyerOnboardingFlowComplete } from "@/lib/buyerOnboarding";
import { useDashboardReducers } from "@/app/hooks/useDashboardReducers";

interface UserDashboardProps {
  children: React.ReactNode;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ children }) => {
  useDashboardReducers();
  const { currentUser, loading: userLoading } = useInitializeUser();
  const { status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [subMenuVisible, setSubMenuVisible] = useState(false);
  let subMenuTimeout: NodeJS.Timeout;

  useEffect(() => {
    if (status === "loading" || userLoading) return;
    if (status === "unauthenticated" && !currentUser) {
      router.replace("/auth/sign-in");
    }
  }, [status, userLoading, currentUser, router]);

  useEffect(() => {
    if (status === "loading" || userLoading || !currentUser) return;

    if (currentUser.role !== "buyer") return;

    const onboardingFlowComplete = isBuyerOnboardingFlowComplete(
      currentUser.email,
    );

    if (!onboardingFlowComplete) {
      router.replace("/buyer-onboarding");
    }
  }, [status, userLoading, currentUser, pathname, router]);

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

  const handleSubMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    clearTimeout(subMenuTimeout);
    setSubMenuAnchorEl(event.currentTarget);
    setSubMenuVisible(true);
  };

  const handleSubMenuClose = () => {
    subMenuTimeout = setTimeout(() => {
      setSubMenuVisible(false);
      setSubMenuAnchorEl(null);
    }, 300); // Adjust the delay as needed
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
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              src={avatarSrc}
              alt={`${displayName}'s profile picture`}
              onClick={handleMenuOpen}
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
