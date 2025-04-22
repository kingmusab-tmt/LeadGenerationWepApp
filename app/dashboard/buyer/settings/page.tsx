"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Avatar,
  Tabs,
  Tab,
  Switch,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Chip,
} from "@mui/material";
import { IUser } from "@/models/user";
import { usCities } from "@/utils/citiesInUsUk";
import { industryNiches } from "@/utils/industryNiches";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
// import cityAreaCodes from "@/utils/cityareacodes";

const preferredDistributionOptions = ["Manual", "Automatic", "Direct"];

const notificationPreferencesOptions = [
  "Email",
  "SMS",
  "Push Notification",
  "In-App Notification",
];

interface ILeadBuyerDetail {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  preferredDistribution: string;
  notificationPreferences: string[];
  status: string;
  leadPreferences: {
    location: string;
    industry: string;
  };
  registeredWith: string;
  walletUnit: number;
}

const AccountSettings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<IUser | null>(null);
  const [leadBuyerDetail, setLeadBuyerDetail] =
    useState<ILeadBuyerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get("/api/getSingleUser");
        setUser(response.data.user);
        setLeadBuyerDetail(response.data.leadbuyerDetail);
      } catch (error) {
        console.error("Error fetching user details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetails();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDarkModeToggle = () => {
    setDarkMode((prev) => !prev);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name.startsWith("leadBuyer.")) {
      const field = name.split(".")[1];
      setLeadBuyerDetail((prev) => (prev ? { ...prev, [field]: value } : null));
    } else {
      setUser((prevUser) =>
        prevUser ? ({ ...prevUser, [name]: value } as IUser) : null
      );
    }
  };

  const handleSelectChange = (event: SelectChangeEvent<string | string[]>) => {
    const { name, value } = event.target;
    if (name === "leadBuyer.notificationPreferences") {
      setLeadBuyerDetail((prev) =>
        prev ? { ...prev, notificationPreferences: value as string[] } : null
      );
    } else if (name === "leadBuyer.preferredDistribution") {
      setLeadBuyerDetail((prev) =>
        prev ? { ...prev, preferredDistribution: value as string } : null
      );
    } else if (name === "leadBuyer.leadPreferences.location") {
      setLeadBuyerDetail((prev) =>
        prev
          ? {
              ...prev,
              leadPreferences: {
                ...prev.leadPreferences,
                location: value as string,
              },
            }
          : null
      );
    } else if (name === "leadBuyer.leadPreferences.industry") {
      setLeadBuyerDetail((prev) =>
        prev
          ? {
              ...prev,
              leadPreferences: {
                ...prev.leadPreferences,
                industry: value as string,
              },
            }
          : null
      );
    }
  };

  const handleSaveChanges = async () => {
    try {
      await axios.put("/api/updateuser", {
        user,
        leadBuyerDetail,
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile", error);
      alert("Failed to update profile");
    }
  };

  return (
    <Box
      sx={{
        width: "89vw",
        maxWidth: 800,
        mx: "auto",
        p: 3,
        bgcolor: darkMode ? "#333" : "#fff",
        color: darkMode ? "#fff" : "#000",
        borderRadius: 2,
        boxShadow: 3,
        overflowX: "hidden",
      }}
    >
      <Typography variant="h5" sx={{ mb: 2, mt: 4, textAlign: "center" }}>
        Account
      </Typography>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="General" />
      </Tabs>
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height={200}
        >
          <LoadingComponent />
        </Box>
      ) : (
        <>
          {tabValue === 0 && (
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Avatar
                      sx={{ width: 80, height: 80, mb: 2 }}
                      src={user?.image}
                      alt="Profile"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Name"
                        name="name"
                        value={user?.name || ""}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        value={user?.email || ""}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Company"
                        name="leadBuyer.company"
                        value={leadBuyerDetail?.company || ""}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="leadBuyer.phone"
                        value={leadBuyerDetail?.phone || ""}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Preferred Distribution</InputLabel>
                        <Select
                          name="leadBuyer.preferredDistribution"
                          value={leadBuyerDetail?.preferredDistribution || ""}
                          onChange={handleSelectChange}
                          label="Preferred Distribution"
                        >
                          {preferredDistributionOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Location</InputLabel>
                        <Select
                          name="leadBuyer.leadPreferences.location"
                          value={
                            leadBuyerDetail?.leadPreferences.location || ""
                          }
                          onChange={handleSelectChange}
                          label="Location"
                        >
                          {usCities.map((city) => (
                            <MenuItem key={city} value={city}>
                              {city}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Industry</InputLabel>
                        <Select
                          name="leadBuyer.leadPreferences.industry"
                          value={
                            leadBuyerDetail?.leadPreferences.industry || ""
                          }
                          onChange={handleSelectChange}
                          label="Industry"
                        >
                          {industryNiches.map((industry) => (
                            <MenuItem
                              key={industry.value}
                              value={industry.value}
                            >
                              {typeof industry === "string"
                                ? industry
                                : industry.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Notification Preferences</InputLabel>
                        <Select
                          name="leadBuyer.notificationPreferences"
                          value={leadBuyerDetail?.notificationPreferences || []}
                          onChange={handleSelectChange}
                          label="Notification Preferences"
                          multiple
                          renderValue={(selected) => (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {(selected as string[]).map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                        >
                          {notificationPreferencesOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 3,
                }}
              >
                <Box>
                  <Typography component="span">Dark Mode</Typography>
                  <Switch
                    checked={darkMode}
                    onChange={handleDarkModeToggle}
                    color="primary"
                  />
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AccountSettings;
