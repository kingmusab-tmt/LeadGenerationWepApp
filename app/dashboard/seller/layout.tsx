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
  CssBaseline,
  CircularProgress,
  Backdrop,
  Collapse,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Dashboard,
  Group,
  Campaign,
  Settings,
  HelpOutline,
  Menu as MenuIcon,
  Call,
  Receipt,
  FormatListBulleted,
  People,
  Person,
  Build,
  ExpandLess,
  ExpandMore,
  Logout,
  Close,
  AccountBalanceWallet,
  Email,
  Sms,
  ViewList,
  Extension,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";
import { handleSignOut } from "@/lib/signOutServerAction";
import InactivityLogout from "@/app/components/generalComponent/InactivityLogout";
import { useInitializeUser } from "@/lib/hooks";
import { useSession } from "next-auth/react";

interface UserDashboardProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 260;
const APPBAR_HEIGHT = 64;

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    path: "overview",
    icon: <Dashboard />,
  },
  {
    title: "Buyers",
    path: "lead_buyers_management",
    icon: <Person />,
  },
  {
    title: "Manual Credit",
    path: "manual-credit",
    icon: <AccountBalanceWallet />,
  },
  {
    title: "Leads",
    path: "lead_management",
    icon: <Group />,
    children: [
      { title: "All Leads", path: "lead_management", icon: <Group /> },
      {
        title: "Form Builder",
        path: "lead_management/formbuilder",
        icon: <Build />,
      },
      {
        title: "Forms",
        path: "lead_management/forms",
        icon: <FormatListBulleted />,
      },
      {
        title: "Transactions",
        path: "lead_management/transactions",
        icon: <Receipt />,
      },
      {
        title: "Call Leads",
        path: "lead_management/leadbuyers",
        icon: <People />,
      },
    ],
  },
  {
    title: "Campaigns",
    path: "campaigns",
    icon: <Campaign />,
  },
  {
    title: "Email Campaigns",
    path: "email-campaigns",
    icon: <Email />,
    children: [
      { title: "All Campaigns", path: "email-campaigns", icon: <ViewList /> },
      {
        title: "Templates",
        path: "email-campaigns/templates",
        icon: <FormatListBulleted />,
      },
    ],
  },
  {
    title: "SMS Campaigns",
    path: "sms-campaigns",
    icon: <Sms />,
    children: [
      { title: "All Campaigns", path: "sms-campaigns", icon: <ViewList /> },
      {
        title: "Templates",
        path: "sms-campaigns/templates",
        icon: <FormatListBulleted />,
      },
    ],
  },
  {
    title: "Call Tracking",
    path: "calltrackingsetting",
    icon: <Call />,
  },
  {
    title: "Integrations",
    path: "integrations",
    icon: <Extension />,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: "Help & Support",
    path: "help",
    icon: <HelpOutline />,
  },
  {
    title: "Settings",
    path: "settings",
    icon: <Settings />,
  },
];

const UserDashboard: React.FC<UserDashboardProps> = ({ children }) => {
  const { currentUser, loading: userLoading } = useInitializeUser();
  const { status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "lead_management",
  ]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const pathname = usePathname();

  const avatarSrc = currentUser?.image || "";
  const displayName = currentUser?.name || "User";
  const userEmail = currentUser?.email || "";

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading" || userLoading) return;
    if (status === "unauthenticated" && !currentUser) {
      router.replace("/auth/sign-in");
    }
  }, [userLoading, currentUser, status, router]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    setLoading(true);
    router.push(`/dashboard/seller/${path}`);
    if (isMobile) {
      setMobileOpen(false);
    }
    setTimeout(() => setLoading(false), 500);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const onSignOut = async () => {
    setLoading(true);
    handleMenuClose();
    try {
      await handleSignOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const isActive = (path: string) => {
    return pathname === `/dashboard/seller/${path}`;
  };

  const isParentActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.path));
    }
    return isActive(item.path);
  };

  // Sidebar content
  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.paper",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          minHeight: APPBAR_HEIGHT,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            L
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Brixcot
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} edge="end">
            <Close />
          </IconButton>
        )}
      </Box>

      {/* User Info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 2,
          mx: 1.5,
          my: 1,
          borderRadius: 2,
          bgcolor: "action.hover",
        }}
      >
        <Avatar
          src={avatarSrc}
          alt={displayName}
          sx={{ width: 40, height: 40 }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap>
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            display="block"
          >
            {userEmail}
          </Typography>
        </Box>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
        <List disablePadding>
          {navItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.includes(item.path);
            const active = hasChildren
              ? isParentActive(item)
              : isActive(item.path);

            return (
              <React.Fragment key={item.path}>
                <ListItemButton
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(item.path);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  sx={{
                    mx: 1.5,
                    mb: 0.5,
                    borderRadius: 2,
                    bgcolor: active ? "primary.main" : "transparent",
                    color: active ? "primary.contrastText" : "text.primary",
                    "&:hover": {
                      bgcolor: active ? "primary.dark" : "action.hover",
                    },
                    "& .MuiListItemIcon-root": {
                      color: active ? "primary.contrastText" : "text.secondary",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontWeight: active ? 600 : 500,
                      fontSize: 14,
                    }}
                  />
                  {hasChildren &&
                    (isExpanded ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>

                {hasChildren && (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {item.children?.map((child) => {
                        const childActive = isActive(child.path);
                        return (
                          <ListItemButton
                            key={child.path}
                            onClick={() => handleNavigation(child.path)}
                            sx={{
                              mx: 1.5,
                              mb: 0.5,
                              pl: 5,
                              borderRadius: 2,
                              bgcolor: childActive
                                ? "primary.main"
                                : "transparent",
                              color: childActive
                                ? "primary.contrastText"
                                : "text.primary",
                              "&:hover": {
                                bgcolor: childActive
                                  ? "primary.dark"
                                  : "action.hover",
                              },
                              "& .MuiListItemIcon-root": {
                                color: childActive
                                  ? "primary.contrastText"
                                  : "text.secondary",
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={child.title}
                              primaryTypographyProps={{
                                fontWeight: childActive ? 600 : 500,
                                fontSize: 13,
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Divider */}
      <Divider sx={{ mx: 2 }} />

      {/* Bottom Navigation */}
      <Box sx={{ py: 1 }}>
        <List disablePadding>
          {bottomNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItemButton
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mx: 1.5,
                  mb: 0.5,
                  borderRadius: 2,
                  bgcolor: active ? "primary.main" : "transparent",
                  color: active ? "primary.contrastText" : "text.primary",
                  "&:hover": {
                    bgcolor: active ? "primary.dark" : "action.hover",
                  },
                  "& .MuiListItemIcon-root": {
                    color: active ? "primary.contrastText" : "text.secondary",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontWeight: active ? 600 : 500,
                    fontSize: 14,
                  }}
                />
              </ListItemButton>
            );
          })}

          {/* Sign Out */}
          <ListItemButton
            onClick={onSignOut}
            sx={{
              mx: 1.5,
              mb: 0.5,
              borderRadius: 2,
              color: "error.main",
              "&:hover": {
                bgcolor: "error.lighter",
              },
              "& .MuiListItemIcon-root": {
                color: "error.main",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Logout />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}
            />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f7fa" }}>
      <CssBaseline />
      <InactivityLogout />

      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: APPBAR_HEIGHT }}>
          {/* Mobile menu button */}
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo for mobile */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              gap: 1,
              flexGrow: 1,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              L
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Brixcot
            </Typography>
          </Box>

          {/* Title for desktop */}
          <Typography
            variant="h6"
            noWrap
            color="text.primary"
            fontWeight={600}
            sx={{ flexGrow: 1, display: { xs: "none", md: "block" } }}
          >
            Seller Dashboard
          </Typography>

          {/* Right side icons */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={() => handleNavigation("help")}
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              <HelpOutline />
            </IconButton>
            <IconButton
              onClick={() => handleNavigation("settings")}
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              <Settings />
            </IconButton>
            <Avatar
              src={avatarSrc}
              alt={displayName}
              onClick={handleMenuOpen}
              sx={{
                width: 36,
                height: 36,
                cursor: "pointer",
                border: 2,
                borderColor: "primary.light",
              }}
            />
          </Box>

          {/* User Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 4,
              sx: { mt: 1, minWidth: 200, borderRadius: 2 },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userEmail}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                handleMenuClose();
                handleNavigation("settings");
              }}
            >
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                handleNavigation("help");
              }}
            >
              <ListItemIcon>
                <HelpOutline fontSize="small" />
              </ListItemIcon>
              Help & Support
            </MenuItem>
            <Divider />
            <MenuItem onClick={onSignOut} sx={{ color: "error.main" }}>
              <ListItemIcon>
                <Logout fontSize="small" sx={{ color: "error.main" }} />
              </ListItemIcon>
              Sign Out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: 1,
            borderColor: "divider",
            top: APPBAR_HEIGHT,
            height: `calc(100% - ${APPBAR_HEIGHT}px)`,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          pt: `${APPBAR_HEIGHT}px`,
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            p: { xs: 2, sm: 3 },
            maxWidth: "100%",
            mx: "auto",
            width: "100%",
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: "#fff", zIndex: theme.zIndex.drawer + 2 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default UserDashboard;
