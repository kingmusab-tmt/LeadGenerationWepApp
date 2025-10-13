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
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import UnitPricingComponent from "./unitsetting/page";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import TawkSetupForm from "./tawksetting/page";
import { useRouter } from "next/navigation";
import StripeOnboardingPage from "./stripeonboarding/page";
import PaypalPayOutPage from "./paypalpayout/page";

// Interface for the minimal user data needed
interface BasicUserInfo {
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  mobileNumber?: string;
  image?: string;
}

interface ApiError {
  message: string;
  errors?: string[];
  status: number;
  success: boolean;
}

// Interface for update payload - only allowed fields
interface UpdateUserPayload {
  name?: string;
  username?: string;
  mobileNumber?: string;
}

const AccountSettings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<BasicUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    username?: string;
    mobileNumber?: string;
  }>({});

  const router = useRouter();
  const tabMap = [
    "general",
    "units-settings",
    "live-chat-setup",
    "stripe-onboarding",
    "paypal-payout",
  ];

  useEffect(() => {
    const url = new URL(window.location.href);
    const tabParam = url.searchParams.get("tab");
    const index = tabMap.indexOf(tabParam || "general");
    setTabValue(index >= 0 ? index : 0);
  }, []);

  // Fetch only the necessary user data
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get("/api/getSingleUser");

        // Extract only the fields we need for the form
        const userData = response.data;
        const basicUserInfo: BasicUserInfo = {
          _id: userData._id,
          name: userData.name || "",
          username: userData.username || "",
          email: userData.email || "",
          mobileNumber: userData.mobileNumber || "",
          image: userData.image || "",
        };

        setUser(basicUserInfo);
      } catch (error) {
        console.error("Error fetching user details", error);
        showSnackbar("Error loading user data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetails();
  }, []);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "warning" | "info"
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const clearFieldErrors = () => {
    setFieldErrors({});
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const tabKey = tabMap[newValue];
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabKey);
    window.history.pushState({}, "", url);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setUser((prevUser) =>
      prevUser ? ({ ...prevUser, [name]: value } as BasicUserInfo) : null
    );

    // Clear field-specific errors when user starts typing
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const extractFieldErrors = (apiErrors: string[]): typeof fieldErrors => {
    const errors: typeof fieldErrors = {};

    apiErrors.forEach((error) => {
      if (error.toLowerCase().includes("name")) {
        errors.name = error;
      } else if (error.toLowerCase().includes("username")) {
        errors.username = error;
      } else if (
        error.toLowerCase().includes("phone") ||
        error.toLowerCase().includes("mobile")
      ) {
        errors.mobileNumber = error;
      }
    });

    return errors;
  };

  const handleSaveChanges = async () => {
    if (!user) return;

    setSaving(true);
    clearFieldErrors();

    try {
      // Create payload with only the allowed fields
      const updatePayload: UpdateUserPayload = {
        name: user.name,
        username: user.username,
        mobileNumber: user.mobileNumber,
      };

      // Remove undefined fields
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key as keyof UpdateUserPayload] === undefined) {
          delete updatePayload[key as keyof UpdateUserPayload];
        }
      });

      // If no fields to update, show warning
      if (Object.keys(updatePayload).length === 0) {
        showSnackbar("No changes to save", "warning");
        setSaving(false);
        return;
      }

      const response = await axios.put("/api/updateuser", updatePayload);

      if (response.data.success) {
        showSnackbar(
          response.data.message || "Profile updated successfully!",
          "success"
        );

        // Update local state with any sanitized data from the response if needed
        // Note: The API doesn't return the updated user, so we assume our local state is correct
        // If you want to be safe, you could refetch the user data here
      } else {
        // Handle API response that indicates failure but didn't throw error
        showSnackbar(
          response.data.message || "Failed to update profile",
          "error"
        );
        if (response.data.errors) {
          const fieldSpecificErrors = extractFieldErrors(response.data.errors);
          setFieldErrors(fieldSpecificErrors);
        }
      }
    } catch (error: any) {
      console.error("Error updating profile", error);

      if (error.response?.data) {
        const errorData: ApiError = error.response.data;

        // Show main error message
        showSnackbar(errorData.message || "Failed to update profile", "error");

        // Extract and set field-specific errors
        if (errorData.errors && errorData.errors.length > 0) {
          const fieldSpecificErrors = extractFieldErrors(errorData.errors);
          setFieldErrors(fieldSpecificErrors);

          // If there are field errors but no general message, show the first field error
          if (!errorData.message && errorData.errors.length > 0) {
            showSnackbar(errorData.errors[0], "error");
          }
        }
      } else if (error.code === "NETWORK_ERROR") {
        showSnackbar(
          "Network error. Please check your connection and try again.",
          "error"
        );
      } else {
        showSnackbar(
          "An unexpected error occurred. Please try again.",
          "error"
        );
      }
    } finally {
      setSaving(false);
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
        Account Settings
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
        <Tab label="Units Settings" />
        <Tab label="Live Chat Setup" />
        <Tab label="Stripe Onboarding" />
        <Tab label="Paypal Payout" />
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
                    <Typography variant="body2" color="textSecondary">
                      Profile picture from your account
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={user?.name || ""}
                        onChange={handleInputChange}
                        error={!!fieldErrors.name}
                        helperText={fieldErrors.name || "Your display name"}
                        disabled={saving}
                        placeholder="Enter your full name"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Username"
                        name="username"
                        value={user?.username || ""}
                        onChange={handleInputChange}
                        error={!!fieldErrors.username}
                        helperText={
                          fieldErrors.username || "Your unique username"
                        }
                        disabled={saving}
                        placeholder="Choose a username"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="mobileNumber"
                        value={user?.mobileNumber || ""}
                        onChange={handleInputChange}
                        error={!!fieldErrors.mobileNumber}
                        helperText={
                          fieldErrors.mobileNumber || "Your contact number"
                        }
                        disabled={saving}
                        placeholder="+1234567890"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        value={user?.email || ""}
                        disabled
                        helperText="Email cannot be changed"
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  mt: 3,
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Reset form to original values
                    const fetchCurrentData = async () => {
                      try {
                        const response = await axios.get("/api/getSingleUser");
                        const userData = response.data;
                        const basicUserInfo: BasicUserInfo = {
                          _id: userData._id,
                          name: userData.name || "",
                          username: userData.username || "",
                          email: userData.email || "",
                          mobileNumber: userData.mobileNumber || "",
                          image: userData.image || "",
                        };
                        setUser(basicUserInfo);
                        clearFieldErrors();
                        showSnackbar("Changes discarded", "info");
                      } catch (error) {
                        showSnackbar("Error resetting form", "error");
                      }
                    };
                    fetchCurrentData();
                  }}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : null}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}

      {tabValue === 1 && <UnitPricingComponent />}
      {tabValue === 2 && <TawkSetupForm />}
      {tabValue === 3 && <StripeOnboardingPage />}
      {tabValue === 4 && <PaypalPayOutPage />}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AccountSettings;
