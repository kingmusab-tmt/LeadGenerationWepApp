"use client";

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  Grid,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  CssBaseline,
} from "@mui/material";
import {
  Dashboard,
  Group,
  Campaign,
  Settings,
  Insights,
  Logout,
  Menu as MenuIcon,
} from "@mui/icons-material";
// import { useTheme } from "@mui/material/styles";
import { useSession } from "next-auth/react";

const AdminDashboard: React.FC = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState("overview");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const isLargeScreen = useMediaQuery("(min-width:960px)");

  const handleNavigation = (section: string) => {
    setSelectedSection(section);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
  };

  const renderContent = () => {
    if (loading) {
      return <Typography variant="h6">Loading...</Typography>;
    }

    switch (selectedSection) {
      case "overview":
        return <Overview />;
      case "leads":
        return <LeadManagement />;
      case "campaigns":
        return <CampaignManagement />;
      case "settings":
        return <SettingsSection />;
      case "reports":
        return <ReportsSection />;
      default:
        return <Overview />;
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              Welcome, Admin Name
            </Typography>
            <Avatar
              src={session?.user?.image}
              alt="Admin Name"
              onClick={handleMenuOpen}
              sx={{ cursor: "pointer" }}
            />
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleNavigation("profile")}>
                Profile
              </MenuItem>
              <MenuItem onClick={() => handleNavigation("settings")}>
                Settings
              </MenuItem>
              <MenuItem onClick={() => console.log("Logout")}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isLargeScreen ? "persistent" : "temporary"}
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: drawerOpen ? 240 : isLargeScreen ? 72 : 60,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerOpen ? 240 : isLargeScreen ? 72 : 60,
            boxSizing: "border-box",
            mt: 8,
            overflowX: "hidden",
          },
        }}
      >
        <List>
          <ListItem
            component="button"
            onClick={() => handleNavigation("overview")}
          >
            <ListItemIcon>
              <Dashboard />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Overview" />}
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("leads")}
          >
            <ListItemIcon>
              <Group />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Lead Management" />}
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("campaigns")}
          >
            <ListItemIcon>
              <Campaign />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Campaign Management" />}
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("reports")}
          >
            <ListItemIcon>
              <Insights />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Reports" />}
          </ListItem>
          <ListItem
            component="button"
            onClick={() => handleNavigation("settings")}
          >
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Settings" />}
          </ListItem>
          <ListItem component="button">
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Logout" />}
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

const Overview: React.FC = () => (
  <Container>
    <Typography variant="h4">Overview</Typography>
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={3} sx={{ padding: 2 }}>
          <Typography variant="h6">Total Leads</Typography>
          <Typography variant="h4">1,230</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={3} sx={{ padding: 2 }}>
          <Typography variant="h6">Conversion Rate</Typography>
          <Typography variant="h4">12.5%</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={3} sx={{ padding: 2 }}>
          <Typography variant="h6">Active Campaigns</Typography>
          <Typography variant="h4">5</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={3} sx={{ padding: 2 }}>
          <Typography variant="h6">Total Revenue</Typography>
          <Typography variant="h4">$12,000</Typography>
        </Paper>
      </Grid>
    </Grid>
  </Container>
);

const LeadManagement: React.FC = () => (
  <Container>
    <Typography variant="h4">Lead Management</Typography>
    {/* Add Lead Management Details */}
  </Container>
);

const CampaignManagement: React.FC = () => (
  <Container>
    <Typography variant="h4">Campaign Management</Typography>
    {/* Add Campaign Management Details */}
  </Container>
);

const ReportsSection: React.FC = () => (
  <Container>
    <Typography variant="h4">Reports</Typography>
    {/* Add Reports Details */}
  </Container>
);

const SettingsSection: React.FC = () => (
  <Container>
    <Typography variant="h4">Settings</Typography>
    {/* Add Settings Details */}
  </Container>
);

export default AdminDashboard;
