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
  Popover,
  Backdrop,
} from "@mui/material";
import {
  Dashboard,
  Group,
  Campaign,
  Settings,
  HelpOutline,
  Menu as MenuIcon,
  Verified,
  Discount,
  Call,
  Receipt,
  FormatListBulleted,
  People,
  Person,
  Build,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { handleSignOut } from "@/lib/signOutServerAction";
import InactivityLogout from "@/app/components/generalComponent/InactivityLogout";

interface UserDashboardProps {
  children: React.ReactNode;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ children }) => {
  const { data: session } = useSession();
  const [image, setImage] = useState(session?.user?.image || "");
  const [name, setName] = useState(session?.user?.name || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subMenuVisible, setSubMenuVisible] = useState(false);
  let subMenuTimeout: NodeJS.Timeout;

  useEffect(() => {
    if (!session) {
      redirect("/auth/sign-in");
    } else if (session) {
      setImage(session.user?.image || "");
      setName(session.user?.name || "");
    }
  }, [session]);

  const handleNavigation = (path: string) => {
    setLoading(true);
    try {
      router.push(`/dashboard/seller/${path}`, { scroll: false });
    } finally {
      setLoading(false);
    }
  };

  const onSignOut = async () => {
    setLoading(true);
    try {
      router.push("/auth/sign-in");
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

  const subMenuOpen = Boolean(subMenuAnchorEl);

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
            Dashboard
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              src={image}
              alt={`${name}'s profile picture`}
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
          },
        }}
      >
        <List sx={{ backgroundColor: "white" }}>
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
          <ListItem
            component="button"
            onClick={() => handleNavigation("lead_buyers_management")}
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
            <Tooltip title="Buyers Management" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Person />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Buyers Management" />
          </ListItem>

          <ListItem
            component="button"
            onMouseEnter={handleSubMenuOpen}
            onMouseLeave={handleSubMenuClose}
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
            <Tooltip title="Lead Management" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Group />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Lead Management" />
          </ListItem>

          <Popover
            open={subMenuVisible}
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
            }}
            disableRestoreFocus
            onMouseEnter={() => clearTimeout(subMenuTimeout)}
            onMouseLeave={handleSubMenuClose}
          >
            <Box sx={{ p: 2, backgroundColor: "white" }}>
              <List>
                <ListItem
                  component="button"
                  onClick={() => handleNavigation("lead_management")}
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
                  <Tooltip title="Leads" placement="right">
                    <ListItemIcon sx={{ color: "blue" }}>
                      <Group />
                    </ListItemIcon>
                  </Tooltip>
                  <ListItemText primary="Leads" />
                </ListItem>

                <ListItem
                  component="button"
                  onClick={() =>
                    handleNavigation("lead_management/formbuilder")
                  }
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
                  <Tooltip title="Form Builder" placement="right">
                    <ListItemIcon sx={{ color: "blue" }}>
                      <Build />
                    </ListItemIcon>
                  </Tooltip>
                  <ListItemText primary="Form Builder" />
                </ListItem>

                <ListItem
                  component="button"
                  onClick={() => handleNavigation("lead_management/forms")}
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
                  <Tooltip title="Forms" placement="right">
                    <ListItemIcon sx={{ color: "blue" }}>
                      <FormatListBulleted />
                    </ListItemIcon>
                  </Tooltip>
                  <ListItemText primary="Forms" />
                </ListItem>

                <ListItem
                  component="button"
                  onClick={() =>
                    handleNavigation("lead_management/transactions")
                  }
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
                      <Receipt />
                    </ListItemIcon>
                  </Tooltip>
                  <ListItemText primary="Transactions" />
                </ListItem>

                <ListItem
                  component="button"
                  onClick={() => handleNavigation("lead_management/leadbuyers")}
                  sx={{
                    color: "blue",
                    backgroundColor: "white",
                    mt: 1,
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
                  <Tooltip title="Call Leads " placement="right">
                    <ListItemIcon sx={{ color: "blue" }}>
                      <People />
                    </ListItemIcon>
                  </Tooltip>
                  <ListItemText primary="Call Leads" />
                </ListItem>
              </List>
            </Box>
          </Popover>

          <ListItem
            component="button"
            onClick={() => handleNavigation("campaigns")}
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
            <Tooltip title="Campaigns" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Campaign />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Campaigns" />
          </ListItem>

          <ListItem
            component="button"
            onClick={() => handleNavigation("lead_verification")}
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
            <Tooltip title="Lead Manual Assignment" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Verified />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Lead Manual Assignment" />
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("promotions")}
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
            <Tooltip title="Promotions" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Discount />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Promotions" />
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("calltrackingsetting")}
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
            <Tooltip title="Call Track Setting" placement="right">
              <ListItemIcon sx={{ color: "blue" }}>
                <Call />
              </ListItemIcon>
            </Tooltip>
            <ListItemText primary="Call Track Setting" />
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
