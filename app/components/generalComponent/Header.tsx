"use client";
import React from "react";
import {
  Button,
  Container,
  useMediaQuery,
  useTheme,
  Stack,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Link as MuiLink,
  Box,
  keyframes,
  Avatar,
  Typography,
  Badge,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import BusinessIcon from "@mui/icons-material/Business";
import Link from "next/link";
import Image from "next/image";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import { signOut } from "next-auth/react";
import logo from "../../../public/BRIXCOT.png";
import {
  ContactPage,
  FeaturedPlayList,
  HowToReg,
  PriceCheckRounded,
} from "@mui/icons-material";
import { FcAbout } from "react-icons/fc";
import { useInitializeUser, useAppDispatch } from "@/lib/hooks";
import { clearUser } from "@/lib/userSlice";

// Animation keyframes
const zoomIn = keyframes`
  from { transform: scale(1); }
  to { transform: scale(1.05); }
`;

const zoomOut = keyframes`
  from { transform: scale(1.05); }
  to { transform: scale(1); }
`;

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] =
    React.useState<null | HTMLElement>(null);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

  // Session management
  const dispatch = useAppDispatch();
  const { currentUser, loading: userLoading } = useInitializeUser();
  const isAuthenticated = !!currentUser;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setUserMenuAnchor(null);
  };

  const handleSignOut = () => {
    signOut();
    dispatch(clearUser());
    handleMenuClose();
  };

  // Lead management specific navigation items
  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard/seller/overview",
      icon: <DashboardIcon fontSize="small" />,
    },
    {
      name: "Leads",
      href: "/dashboard/seller/lead_management",
      icon: <PeopleIcon fontSize="small" />,
    },
    {
      name: "Analytics",
      href: "/dashboard/seller/overview",
      icon: <AnalyticsIcon fontSize="small" />,
    },
  ];

  const publicNavItems = [
    {
      name: "About Us",
      href: "/about",
      icon: <FcAbout fontSize="small" />,
    },
    {
      name: "Features",
      href: "/#features",
      icon: <FeaturedPlayList fontSize="small" />,
    },
    {
      name: "How It Works",
      href: "/how-it-works",
      icon: <HowToReg fontSize="small" />,
    },
    {
      name: "Pricing",
      href: "/#pricing",
      icon: <PriceCheckRounded fontSize="small" />,
    },
    {
      name: "Contact",
      href: "/contact",
      icon: <ContactPage fontSize="small" />,
    },
  ];

  const displayItems = isAuthenticated ? navItems : publicNavItems;

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={2}
      sx={{
        backgroundColor: "background.paper",
        backdropFilter: "blur(10px)",
        borderBottom: `2px solid ${theme.palette.primary.main}20`,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ py: 1 }}>
          {/* Logo */}
          <MuiLink
            component={Link}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: { xs: 1, md: 0 },
              mr: 4,
              "&:hover": {
                animation: `${zoomIn} 0.2s forwards`,
              },
              "&:not(:hover)": {
                animation: `${zoomOut} 0.2s forwards`,
              },
              textDecoration: "none",
            }}
          >
            <Image
              src={logo}
              alt="Brixcot Lead Management"
              width={45}
              height={45}
              style={{ marginRight: 12 }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                BRIXCOT
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  display: { xs: "none", sm: "block" },
                }}
              >
                Lead Management
              </Typography>
            </Box>
          </MuiLink>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
              {displayItems.map((item) => (
                <Box
                  key={item.name}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  sx={{
                    position: "relative",
                    "&:after": {
                      content: '""',
                      position: "absolute",
                      bottom: -4,
                      left: 0,
                      width: hoveredItem === item.name ? "100%" : "0%",
                      height: 3,
                      backgroundColor: theme.palette.primary.main,
                      transition: "width 0.3s ease",
                      borderRadius: 2,
                    },
                  }}
                >
                  <Button
                    component={Link}
                    href={item.href}
                    startIcon={item.icon}
                    sx={{
                      px: 2,
                      py: 1,
                      color: "text.primary.main",
                      fontWeight: 600,
                      textTransform: "none",
                      fontSize: "0.9rem",
                      "&:hover": {
                        color: theme.palette.primary.main,
                        backgroundColor: theme.palette.action.hover,
                        transform: "translateY(-1px)",
                      },
                      transform:
                        hoveredItem === item.name ? "translateY(-1px)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {item.name}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}

          {/* User Actions Section */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {userLoading ? (
              // Loading state
              <Button variant="outlined" disabled>
                Loading...
              </Button>
            ) : isAuthenticated ? (
              // Authenticated user
              <>
                {!isMobile && (
                  <>
                    <IconButton
                      color="inherit"
                      sx={{ color: theme.palette.text.primary }}
                    >
                      <Badge badgeContent={4} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                    <Button
                      variant="contained"
                      startIcon={<DashboardIcon />}
                      component={Link}
                      href="/dashboard/seller/overview"
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        px: 3,
                      }}
                    >
                      Dashboard
                    </Button>
                  </>
                )}

                {/* User Avatar Menu */}
                <IconButton
                  onClick={handleUserMenuOpen}
                  sx={{
                    border: `2px solid ${theme.palette.primary.main}30`,
                    "&:hover": {
                      border: `2px solid ${theme.palette.primary.main}`,
                      transform: "scale(1.05)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: theme.palette.primary.main,
                      fontSize: "0.8rem",
                    }}
                    src={currentUser?.image || undefined}
                  >
                    {currentUser?.name?.charAt(0) || "U"}
                  </Avatar>
                </IconButton>

                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                      boxShadow: theme.shadows[8],
                      borderRadius: 2,
                      "& .MuiMenuItem-root": {
                        px: 2,
                        py: 1.5,
                        "&:hover": {
                          backgroundColor: theme.palette.primary.light,
                          color: theme.palette.primary.contrastText,
                        },
                      },
                    },
                  }}
                >
                  <MenuItem onClick={handleMenuClose}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {currentUser?.name || "User"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currentUser?.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem
                    onClick={handleMenuClose}
                    component={Link}
                    href="/profile"
                  >
                    Profile
                  </MenuItem>
                  <MenuItem
                    onClick={handleMenuClose}
                    component={Link}
                    href="/settings"
                  >
                    Settings
                  </MenuItem>
                  <MenuItem
                    onClick={handleSignOut}
                    sx={{ color: theme.palette.error.main }}
                  >
                    <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              // Unauthenticated user
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  component={Link}
                  href="/auth/sign-in"
                  startIcon={<LoginIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                  }}
                >
                  Login
                </Button>
                {/* <Button
                  variant="contained"
                  component={Link}
                  href="/auth/sign-up"
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    display: { xs: "none", sm: "flex" },
                  }}
                >
                  Sign Up
                </Button> */}
              </Stack>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                edge="end"
                color="inherit"
                aria-label="menu"
                onClick={handleMenuOpen}
                sx={{
                  color: theme.palette.text.primary,
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                    transform: "scale(1.1)",
                  },
                  transition: "transform 0.2s",
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>

          {/* Mobile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 280,
                boxShadow: theme.shadows[8],
                borderRadius: 2,
                "& .MuiMenuItem-root": {
                  px: 3,
                  py: 1.5,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                  },
                },
              },
            }}
          >
            {displayItems.map((item) => (
              <MenuItem
                key={item.name}
                onClick={handleMenuClose}
                component={Link}
                href={item.href}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    width: "100%",
                  }}
                >
                  {item.icon}
                  <Typography variant="body2" fontWeight={500}>
                    {item.name}
                  </Typography>
                </Box>
              </MenuItem>
            ))}

            {isAuthenticated && (
              <MenuItem
                onClick={handleMenuClose}
                component={Link}
                href="/dashboard/seller/overview"
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    width: "100%",
                  }}
                >
                  <DashboardIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={500}>
                    Dashboard
                  </Typography>
                </Box>
              </MenuItem>
            )}

            {isAuthenticated ? (
              <MenuItem
                onClick={handleSignOut}
                sx={{ color: theme.palette.error.main }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    width: "100%",
                  }}
                >
                  <LogoutIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={500}>
                    Sign Out
                  </Typography>
                </Box>
              </MenuItem>
            ) : (
              <MenuItem
                component={Link}
                href="/auth/sign-in"
                onClick={handleMenuClose}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    width: "100%",
                  }}
                >
                  <LoginIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={500}>
                    Login
                  </Typography>
                </Box>
              </MenuItem>
            )}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
