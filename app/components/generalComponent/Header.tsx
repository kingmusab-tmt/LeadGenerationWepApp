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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";
import Image from "next/image";
import LoginIcon from "@mui/icons-material/Login";
import logo from "../../../public/BRIXCOT.png"; // Adjust the path as necessary

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
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const navItems = [
    { name: "Features", href: "/#features" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Contact Us", href: "/contact" },
    // { name: "Industries", href: "/industries" },
  ];

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Link href="/" passHref>
            <MuiLink
              sx={{
                display: "flex",
                alignItems: "center",
                flexGrow: 1,
                "&:hover": {
                  animation: `${zoomIn} 0.2s forwards`,
                },
                "&:not(:hover)": {
                  animation: `${zoomOut} 0.2s forwards`,
                },
              }}
            >
              <Image
                src={logo} // Replace with your actual logo path
                alt="Brixcot Logo"
                width={40}
                height={40}
                style={{ marginRight: 10 }}
              />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  fontSize: "1.25rem",
                }}
              >
                BRIXCOT
              </Box>
            </MuiLink>
          </Link>

          {isMobile ? (
            <>
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
                    transition: "transform 0.2s",
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                    boxShadow: theme.shadows[4],
                    "& .MuiMenuItem-root": {
                      "&:hover": {
                        backgroundColor: theme.palette.primary.light,
                        color: theme.palette.primary.contrastText,
                      },
                      transition: "all 0.2s ease",
                    },
                  },
                }}
              >
                {navItems.map((item) => (
                  <MenuItem
                    key={item.name}
                    onClick={handleMenuClose}
                    sx={{
                      py: 1.5,
                      px: 3,
                    }}
                  >
                    <Link href={item.href} passHref>
                      <MuiLink
                        sx={{
                          textDecoration: "none",
                          color: "inherit",
                          width: "100%",
                        }}
                      >
                        {item.name}
                      </MuiLink>
                    </Link>
                  </MenuItem>
                ))}
                <MenuItem
                  onClick={handleMenuClose}
                  sx={{
                    py: 1.5,
                    px: 3,
                  }}
                >
                  <Link href="/auth/sign-in" passHref>
                    <MuiLink
                      sx={{
                        textDecoration: "none",
                        color: "inherit",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <LoginIcon fontSize="small" /> Login
                    </MuiLink>
                  </Link>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={2} alignItems="center">
              {navItems.map((item) => (
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
                      height: 2,
                      backgroundColor: theme.palette.primary.main,
                      transition: "width 0.3s ease",
                    },
                  }}
                >
                  <Link href={item.href} passHref>
                    <MuiLink
                      color="text.primary"
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        textDecoration: "none",
                        "&:hover": {
                          color: theme.palette.primary.main,
                          backgroundColor: theme.palette.action.hover,
                          transform: "scale(1.05)",
                          transition: "all 0.2s ease",
                        },
                        transform:
                          hoveredItem === item.name
                            ? "scale(1.05)"
                            : "scale(1)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {item.name}
                    </MuiLink>
                  </Link>
                </Box>
              ))}
              <Button
                variant="outlined"
                color="primary"
                component={Link}
                href="/auth/sign-in"
                startIcon={<LoginIcon />}
                sx={{
                  ml: 2,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    transform: "scale(1.05)",
                    boxShadow: theme.shadows[2],
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Login
              </Button>
            </Stack>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
