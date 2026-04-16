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
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  CssBaseline,
  CircularProgress,
  Backdrop,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import {
  Dashboard,
  HelpOutline,
  Menu as MenuIcon,
  ReceiptLong,
  People,
  Layers,
  Article,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { handleSignOut } from "@/lib/signOutServerAction";
import { useDashboardReducers } from "@/app/hooks/useDashboardReducers";

const navItems = [
  { label: "Overview", path: "overview", icon: <Dashboard /> },
  { label: "User Management", path: "user_management", icon: <People /> },
  { label: "Tier Management", path: "tier_management", icon: <Layers /> },
  { label: "Help Management", path: "help_management", icon: <HelpOutline /> },
  {
    label: "Financial Management",
    path: "financial_management",
    icon: <ReceiptLong />,
  },
  {
    label: "Content Management",
    path: "content_management",
    icon: <Article />,
  },
];

interface AdminDashboardProps {
  children: React.ReactNode;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ children }) => {
  useDashboardReducers();
  const { status, data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const currentUser = session?.user;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !currentUser) {
      router.replace("/auth/sign-in");
      return;
    }

    if (currentUser.role !== "admin") {
      router.replace("/auth/unauthorized");
    }
  }, [status, currentUser, router]);

  const avatarSrc = currentUser?.image || "";
  const displayName = currentUser?.name || "User";

  // Derive the active nav item from the current pathname
  const activeNav = navItems.find((item) =>
    pathname?.includes(`/admindashboard/${item.path}`),
  );

  const handleNavigation = (path: string) => {
    setLoading(true);
    try {
      router.push(`/admindashboard/${path}`, { scroll: false });
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

  if (status === "loading") {
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
            Dashboard
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
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  onSignOut();
                }}
              >
                {loading ? <CircularProgress size={24} /> : "Sign Out"}
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
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        <List>
          {navItems.map((item) => {
            const isActive = pathname?.includes(`/admindashboard/${item.path}`);
            return (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  color: isActive
                    ? theme.palette.primary.contrastText
                    : theme.palette.primary.main,
                  backgroundColor: isActive
                    ? theme.palette.primary.main
                    : "transparent",
                  border: "none",
                  "&:hover": {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    "& .MuiListItemIcon-root": {
                      color: theme.palette.primary.contrastText,
                    },
                  },
                  "&.Mui-selected": {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    "& .MuiListItemIcon-root": {
                      color: theme.palette.primary.contrastText,
                    },
                    "&:hover": {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  },
                }}
              >
                <Tooltip title={item.label} placement="right">
                  <ListItemIcon
                    sx={{
                      color: isActive
                        ? theme.palette.primary.contrastText
                        : theme.palette.primary.main,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                </Tooltip>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, mt: 3 }}>
        {activeNav && (
          <Box sx={{ px: 3, pt: 5 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <MuiLink
                underline="hover"
                color="inherit"
                sx={{ cursor: "pointer" }}
                onClick={() => handleNavigation("overview")}
              >
                Admin
              </MuiLink>
              <Typography color="text.primary">{activeNav.label}</Typography>
            </Breadcrumbs>
          </Box>
        )}
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

export default AdminDashboard;
