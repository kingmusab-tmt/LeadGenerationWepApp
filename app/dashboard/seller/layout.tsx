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
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
  Badge,
  Popover,
} from "@mui/material";
import {
  Dashboard,
  Group,
  Campaign,
  Settings,
  HelpOutline,
  Menu as MenuIcon,
  Verified,
  Call,
  Receipt,
  FormatListBulleted,
  People,
  Person,
  Build,
  Logout,
  KeyboardArrowDown,
  KeyboardArrowRight,
  ChevronLeft,
  Notifications,
  Email,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { handleSignOut } from "@/lib/signOutServerAction";
import InactivityLogout from "@/app/components/generalComponent/InactivityLogout";

interface UserDashboardProps {
  children: React.ReactNode;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ children }) => {
  const { data: session } = useSession();
  const [image, setImage] = useState(session?.user?.image || "");
  const [name, setName] = useState(session?.user?.name || "");
  const [menuOpen, setMenuOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [leadManagementOpen, setLeadManagementOpen] = useState(false);
  const [subMenuVisible, setSubMenuVisible] = useState(false);
  let subMenuTimeout: NodeJS.Timeout;

  useEffect(() => {
    if (session) {
      setImage(session.user?.image || "");
      setName(session.user?.name || "");
    }
  }, [session]);

  const handleNavigation = (path?: string) => {
    if (!path) return;
    setLoading(true);
    try {
      router.push(`/dashboard/seller/${path}`, { scroll: false });
      if (isMobile) {
        setMenuOpen(false);
      }
      setSubMenuVisible(false);
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

  const toggleLeadManagement = () => {
    setLeadManagementOpen((prev) => !prev);
  };

  const handleSubMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!menuOpen && !isMobile) {
      clearTimeout(subMenuTimeout);
      setSubMenuAnchorEl(event.currentTarget);
      setSubMenuVisible(true);
    }
  };

  const handleSubMenuClose = () => {
    if (!menuOpen && !isMobile) {
      subMenuTimeout = setTimeout(() => {
        setSubMenuVisible(false);
        setSubMenuAnchorEl(null);
      }, 300);
    }
  };

  const menuItems = [
    { icon: <Dashboard />, text: "Overview", path: "overview" },
    {
      icon: <Person />,
      text: "Buyers Management",
      path: "lead_buyers_management",
    },
    {
      icon: <Group />,
      text: "Lead Management",
      hasSubmenu: true,
      subItems: [
        { icon: <Group />, text: "Leads", path: "lead_management" },
        {
          icon: <Build />,
          text: "Form Builder",
          path: "lead_management/formbuilder",
        },
        {
          icon: <FormatListBulleted />,
          text: "Forms",
          path: "lead_management/forms",
        },
        {
          icon: <Receipt />,
          text: "Transactions",
          path: "lead_management/transactions",
        },
        {
          icon: <People />,
          text: "Call Leads",
          path: "lead_management/leadbuyers",
        },
      ],
    },
    { icon: <Campaign />, text: "Campaigns", path: "campaigns" },
    {
      icon: <Verified />,
      text: "Lead Manual Assignment",
      path: "lead_verification",
    },
    { icon: <Call />, text: "Call Track Setting", path: "calltrackingsetting" },
  ];

  const bottomMenuItems = [
    { icon: <HelpOutline />, text: "Help", path: "help" },
    { icon: <Settings />, text: "Settings", path: "settings" },
  ];

  return (
    <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#f5f5f5" }}>
      <CssBaseline />
      <InactivityLogout />

      {/* AppBar with original blue color */}
      <AppBar
        position="fixed"
        elevation={2}
        sx={{
          backgroundColor: "#1976d2",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{ justifyContent: "space-between", minHeight: "64px!important" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleMenu}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Seller Dashboard
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={3} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Messages">
              <IconButton color="inherit">
                <Badge badgeContent={1} color="error">
                  <Email />
                </Badge>
              </IconButton>
            </Tooltip> */}

            <Tooltip title="Account">
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  p: 1,
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: alpha("#fff", 0.1),
                  },
                }}
                onClick={handleMenuOpen}
              >
                <Avatar
                  src={image}
                  alt={`${name}'s profile picture`}
                  sx={{
                    width: 36,
                    height: 36,
                  }}
                />
                <Box sx={{ display: { xs: "none", sm: "block" } }}>
                  <Typography variant="body2" fontWeight="500">
                    {name}
                  </Typography>
                </Box>
                <KeyboardArrowDown />
              </Box>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 160,
                  "& .MuiMenuItem-root": {
                    px: 2,
                    py: 1,
                  },
                },
              }}
            >
              <MenuItem onClick={() => handleNavigation("settings")}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={onSignOut}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar with original blue color scheme */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={menuOpen}
        onClose={toggleMenu}
        sx={{
          width: menuOpen ? 240 : 10,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: menuOpen ? 240 : 60,
            boxSizing: "border-box",
            transition: "width 0.3s ease",
            mt: "64px",
            backgroundColor: "white",
            overflowX: "hidden",
          },
        }}
      >
        <Box sx={{ p: 1, display: "flex", justifyContent: "flex-end" }}>
          {menuOpen && (
            <IconButton
              onClick={toggleMenu}
              size="small"
              sx={{ color: "blue" }}
            >
              <ChevronLeft />
            </IconButton>
          )}
        </Box>

        <List sx={{ p: 0 }}>
          {menuItems.map((item) => (
            <React.Fragment key={item.text}>
              {item.hasSubmenu ? (
                <>
                  <ListItem
                    component="button"
                    onClick={menuOpen ? toggleLeadManagement : undefined}
                    onMouseEnter={handleSubMenuOpen}
                    onMouseLeave={handleSubMenuClose}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      color: "blue",
                      backgroundColor: "white",
                      border: "none",
                      py: 2,
                      px: 2,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      "&:hover": {
                        backgroundColor: "blue",
                        color: "white",
                        "& .MuiListItemIcon-root": {
                          color: "white",
                        },
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <ListItemIcon
                        sx={{
                          minWidth: 40,
                          color: "blue",
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {menuOpen && <ListItemText primary={item.text} />}
                    </Box>
                    {menuOpen && (
                      <KeyboardArrowRight
                        sx={{
                          transform: leadManagementOpen
                            ? "rotate(90deg)"
                            : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    )}
                  </ListItem>

                  {/* Expanded submenu when sidebar is open */}
                  {leadManagementOpen && menuOpen && (
                    <Box sx={{ pl: 3 }}>
                      {item.subItems.map((subItem) => (
                        <ListItem
                          key={subItem.text}
                          component="button"
                          onClick={() => handleNavigation(subItem.path)}
                          sx={{
                            width: "100%",
                            textAlign: "left",
                            color: "blue",
                            backgroundColor: "white",
                            border: "none",
                            py: 2,
                            px: 2,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            "&:hover": {
                              backgroundColor: "blue",
                              color: "white",
                              "& .MuiListItemIcon-root": {
                                color: "white",
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 36,
                              color: "blue",
                            }}
                          >
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={subItem.text}
                            primaryTypographyProps={{ fontSize: "0.85rem" }}
                          />
                        </ListItem>
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <ListItem
                  component="button"
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    width: "100%",
                    textAlign: "left",
                    color: "blue",
                    backgroundColor: "white",
                    border: "none",
                    py: 2,
                    px: 2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "blue",
                      color: "white",
                      "& .MuiListItemIcon-root": {
                        color: "white",
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: "blue",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {menuOpen && <ListItemText primary={item.text} />}
                </ListItem>
              )}
            </React.Fragment>
          ))}
        </List>

        {/* Hover submenu popover for collapsed sidebar */}
        <Popover
          open={subMenuVisible && !menuOpen && !isMobile}
          anchorEl={subMenuAnchorEl}
          onClose={handleSubMenuClose}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          sx={{
            pointerEvents: "auto",
            ml: 1,
          }}
          disableRestoreFocus
          onMouseEnter={() => clearTimeout(subMenuTimeout)}
          onMouseLeave={handleSubMenuClose}
        >
          <Box sx={{ p: 1, backgroundColor: "white", minWidth: 200 }}>
            <List sx={{ p: 0 }}>
              {(menuItems.find((item) => item.hasSubmenu)?.subItems ?? []).map(
                (subItem) => (
                  <ListItem
                    key={subItem.text}
                    component="button"
                    onClick={() => handleNavigation(subItem.path)}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      color: "blue",
                      backgroundColor: "white",
                      border: "none",
                      py: 1,
                      px: 2,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      "&:hover": {
                        backgroundColor: "blue",
                        color: "white",
                        "& .MuiListItemIcon-root": {
                          color: "white",
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: "blue",
                      }}
                    >
                      {subItem.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={subItem.text}
                      primaryTypographyProps={{ fontSize: "0.9rem" }}
                    />
                  </ListItem>
                )
              )}
            </List>
          </Box>
        </Popover>

        <Box sx={{ p: 0 }}>
          <Divider sx={{ my: 1 }} />
          <List sx={{ p: 0 }}>
            {bottomMenuItems.map((item) => (
              <ListItem
                key={item.text}
                component="button"
                onClick={() => handleNavigation(item.path)}
                sx={{
                  width: "100%",
                  textAlign: "left",
                  color: "blue",
                  backgroundColor: "white",
                  border: "none",
                  py: 1.2,
                  px: 2,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "blue",
                    color: "white",
                    "& .MuiListItemIcon-root": {
                      color: "white",
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: "blue",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {menuOpen && <ListItemText primary={item.text} />}
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content with reduced margins */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: "10px",
          // p: 2,
          transition: "margin-left 0.3s ease",
          marginLeft: menuOpen && !isMobile ? "10px" : "5px",
          backgroundColor: "#f5f5f5",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {children}
      </Box>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 2,
        }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default UserDashboard;
