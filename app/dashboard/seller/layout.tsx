"use client";

import React, { useEffect, useRef, useState } from "react";
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
} from "@mui/material";
import {
  Dashboard,
  Group,
  Settings,
  HelpOutline,
  Menu as MenuIcon,
  Call,
  Receipt,
  FormatListBulleted,
  Person,
  Build,
  ExpandLess,
  ExpandMore,
  Logout,
  Close,
  AccountBalanceWallet,
  Email,
  Sms,
  Extension,
  LocationOn,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";
import { handleSignOut } from "@/lib/signOutServerAction";
import InactivityLogout from "@/app/components/generalComponent/InactivityLogout";
import DarkModeToggle from "@/app/components/generalComponent/darkmodetoggle";
import NotificationBell from "@/app/components/generalComponent/NotificationBell";
import { useInitializeUser, useDashboardTerms } from "@/app/hooks";
import { useSession } from "next-auth/react";
import { useSubscriptionLimits } from "@/app/hooks/useSubscriptionLimits";
import { isSellerOnboardingFlowComplete } from "@/lib/sellerOnboarding";
import { useDashboardReducers } from "@/app/hooks/useDashboardReducers";
import SubscriptionExpiryModal from "./components/SubscriptionExpiryModal";

interface UserDashboardProps {
  children?: React.ReactNode;
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
        title: "Location Routing",
        path: "lead_management/location-routing",
        icon: <LocationOn />,
      },
    ],
  },
  {
    title: "Email Campaigns",
    path: "email-campaigns",
    icon: <Email />,
  },
  {
    title: "SMS Campaigns",
    path: "sms-campaigns",
    icon: <Sms />,
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

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const getLocalDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const UserDashboard: React.FC<UserDashboardProps> = ({ children }) => {
  useDashboardReducers();
  const { currentUser, loading: userLoading } = useInitializeUser();
  const terms = useDashboardTerms();
  const { status } = useSession();
  const { limits, isTrial, loading: limitsLoading } = useSubscriptionLimits();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "lead_management",
  ]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [expiryReminderOpen, setExpiryReminderOpen] = useState(false);
  const [expiryReminder, setExpiryReminder] = useState<{
    daysRemaining: number;
    expiryDate: string;
    planName: string | null;
    isFreeTrial: boolean;
  } | null>(null);
  const expiryReminderCheckedForUserRef = useRef<string | null>(null);

  const theme = useTheme();
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

  useEffect(() => {
    if (status === "loading" || userLoading || limitsLoading || !currentUser)
      return;

    const isSellerRole =
      currentUser.role === "seller" || currentUser.role === "business-admin";
    if (!isSellerRole) {
      if (currentUser.role === "admin") {
        router.replace("/admindashboard/overview");
      } else if (currentUser.role === "buyer" || currentUser.role === "staff") {
        router.replace("/dashboard/buyer/overview");
      } else {
        router.replace("/completeregistration");
      }
      return;
    }

    const onboardingFlowComplete = isSellerOnboardingFlowComplete(
      currentUser.email,
    );

    // Always enforce onboarding for seller dashboard pages unless onboarding is complete
    // Skip this check only for the onboarding page itself to prevent redirect loops
    const isOnOnboardingPage = pathname === "/dashboard/seller/onboarding";

    if (!isOnOnboardingPage && !onboardingFlowComplete) {
      router.replace("/dashboard/seller/onboarding");
    }
  }, [status, userLoading, limitsLoading, currentUser, pathname, router]);

  useEffect(() => {
    if (status === "loading" || userLoading || limitsLoading) {
      return;
    }

    if (!currentUser?.id) {
      expiryReminderCheckedForUserRef.current = null;
      setExpiryReminderOpen(false);
      setExpiryReminder(null);
      return;
    }

    const isSellerRole =
      currentUser.role === "seller" || currentUser.role === "business-admin";

    if (!isSellerRole) {
      expiryReminderCheckedForUserRef.current = null;
      setExpiryReminderOpen(false);
      setExpiryReminder(null);
      return;
    }

    if (expiryReminderCheckedForUserRef.current === currentUser.id) {
      return;
    }

    expiryReminderCheckedForUserRef.current = currentUser.id;

    const checkExpiryReminder = async () => {
      try {
        const response = await fetch("/api/subscriptions/manage");
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const subscription = data?.subscription;
        const expirySource =
          subscription?.subscriptionExpiryDate ??
          subscription?.stripeDetails?.currentPeriodEnd;

        if (!expirySource) {
          return;
        }

        const expiryDate = new Date(expirySource);
        if (Number.isNaN(expiryDate.getTime())) {
          return;
        }

        const now = new Date();
        const daysRemaining = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / DAY_IN_MS,
        );

        if (daysRemaining < 1 || daysRemaining > 7) {
          return;
        }

        const storageKey = `brixcot:subscription-expiry-modal:last-shown:${currentUser.id}`;
        const todayKey = getLocalDateKey(now);

        if (window.localStorage.getItem(storageKey) === todayKey) {
          return;
        }

        window.localStorage.setItem(storageKey, todayKey);
        setExpiryReminder({
          daysRemaining,
          expiryDate: expiryDate.toISOString(),
          planName:
            subscription?.subscriptionPlan ||
            subscription?.tierDetails?.name ||
            null,
          isFreeTrial:
            subscription?.isTrial === true ||
            subscription?.subscriptionTierType === "free" ||
            subscription?.subscriptionPlan === "14-Day Free Trial",
        });
        setExpiryReminderOpen(true);
      } catch (error) {
        console.error("Failed to check subscription expiry reminder:", error);
      }
    };

    void checkExpiryReminder();
  }, [currentUser, limitsLoading, status, userLoading]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    setLoading(true);
    router.push(`/dashboard/seller/${normalizedPath}`);
    setMobileOpen(false);
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

  // Filter nav items based on subscription limits (show all while loading)
  const filteredNavItems = navItems.filter((item) => {
    // Manual credit's API requires the exact "seller" role — there's no
    // parent-seller association for business-admin accounts to act through,
    // so surfacing this nav entry to them is a guaranteed dead end (empty
    // buyer list, then a 403 on submit).
    if (item.path === "manual-credit" && currentUser?.role !== "seller") {
      return false;
    }
    if (!limits) return true;
    if (
      item.path === "email-campaigns" &&
      !isTrial &&
      limits.emailCampaignsEnabled === false
    ) {
      return false;
    }
    if (
      item.path === "sms-campaigns" &&
      !isTrial &&
      limits.smsCampaignsEnabled === false
    ) {
      return false;
    }
    if (
      item.path === "integrations" &&
      !isTrial &&
      limits.zapierIntegration === false
    ) {
      return false;
    }
    return true;
  });

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
      {/* Mobile close control */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          justifyContent: "flex-end",
          p: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <IconButton
          onClick={handleDrawerToggle}
          edge="end"
          aria-label="Close navigation menu"
        >
          <Close />
        </IconButton>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
        <List disablePadding>
          {filteredNavItems.map((item) => {
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
                    primary={
                      item.path === "lead_buyers_management"
                        ? terms.buyers
                        : item.title
                    }
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
      <Box
        sx={{
          py: 1,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.dark} 100%)`,
        }}
      >
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
                  bgcolor: active ? "rgba(255,255,255,0.2)" : "transparent",
                  color: "common.white",
                  "&:hover": {
                    bgcolor: active
                      ? "rgba(255,255,255,0.28)"
                      : "rgba(255,255,255,0.14)",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "common.white",
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
              color: "common.white",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.14)",
              },
              "& .MuiListItemIcon-root": {
                color: "common.white",
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
      <SubscriptionExpiryModal
        open={expiryReminderOpen}
        daysRemaining={expiryReminder?.daysRemaining || 0}
        expiryDate={expiryReminder?.expiryDate || ""}
        planName={expiryReminder?.planName || null}
        isFreeTrial={expiryReminder?.isFreeTrial || false}
        onClose={() => setExpiryReminderOpen(false)}
        onRenewNow={() => {
          setExpiryReminderOpen(false);
          router.push("/dashboard/seller/settings/subscription");
        }}
        onUpgradePlan={() => {
          setExpiryReminderOpen(false);
          router.push("/plan");
        }}
      />

      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.dark} 100%)`,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: APPBAR_HEIGHT }}>
          {/* Mobile menu button */}
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            aria-label="Open navigation menu"
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Title for desktop */}
          <Typography
            variant="h6"
            noWrap
            color="common.white"
            fontWeight={600}
            sx={{ flexGrow: 1, display: "block" }}
          >
            {terms.org} Dashboard
          </Typography>

          {/* Right side icons */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DarkModeToggle
              sx={{
                display: { xs: "none", sm: "flex" },
                color: "common.white",
              }}
            />
            <NotificationBell
              onClick={() => handleNavigation("notifications")}
              sx={{
                display: { xs: "none", sm: "flex" },
                color: "common.white",
              }}
            />
            <IconButton
              onClick={() => handleNavigation("help")}
              aria-label="Help and support"
              sx={{
                display: { xs: "none", sm: "flex" },
                color: "common.white",
              }}
            >
              <HelpOutline />
            </IconButton>
            <IconButton
              onClick={() => handleNavigation("settings")}
              aria-label="Settings"
              sx={{
                display: { xs: "none", sm: "flex" },
                color: "common.white",
              }}
            >
              <Settings />
            </IconButton>
            <Avatar
              src={avatarSrc}
              alt={displayName}
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
              sx={{
                width: 36,
                height: 36,
                cursor: "pointer",
                border: 2,
                borderColor: "rgba(255,255,255,0.5)",
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
