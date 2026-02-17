"use client";
import React, { useState, useEffect } from "react";
import axios from "@/lib/axiosInstance";
import {
  Box,
  Button,
  TextField,
  Typography,
  Avatar,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
} from "@mui/material";
import UnitPricingComponent from "./unitsetting/page";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import TawkSetupForm from "./tawksetting/page";
import { useRouter } from "next/navigation";
import StripeOnboardingPage from "./stripeonboarding/page";
import LeadDistributionSettings from "./leadsellersetting/page";
import EmailSettingsPage from "./emailsetting/page";
import APISettingsPage from "./apisetting/page";
import SubscriptionManagement from "./subscription/SubscriptionManagement";
import ChangePlanModal from "./subscription/ChangePlanModal";
import PaymentMethodsManager from "./subscription/PaymentMethodsManager";
import { useInitializeUser, useAppDispatch } from "@/lib/hooks";
import { updateUser } from "@/lib/userSlice";
import { useNotification } from "@/lib/useNotification";

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
  const dispatch = useAppDispatch();
  const notify = useNotification();
  const {
    currentUser,
    loading: userLoading,
    refreshUser,
  } = useInitializeUser();
  const [tabValue, setTabValue] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [editableUser, setEditableUser] = useState<BasicUserInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    username?: string;
    mobileNumber?: string;
  }>({});
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);

  const router = useRouter();
  const tabMap = [
    "general",
    "lead-distribution",
    "units-settings",
    "live-chat-setup",
    "email-settings",
    "api-settings",
    "stripe-onboarding",
    "subscription",
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const tabParam = url.searchParams.get("tab");
      const index = tabMap.indexOf(tabParam || "general");
      setTabValue(index >= 0 ? index : 0);
    } catch (error) {
      console.error("Error parsing tab from URL:", error);
      setTabValue(0);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      const basicUserInfo: BasicUserInfo = {
        _id: currentUser.id || "",
        name: currentUser.name || "",
        username: currentUser.username || "",
        email: currentUser.email || "",
        mobileNumber: currentUser.mobileNumber || currentUser.mobile || "",
        image: currentUser.image || "",
      };
      setEditableUser(basicUserInfo);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser && !userLoading) {
      refreshUser();
    }
  }, [currentUser, userLoading, refreshUser]);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "warning" | "info",
  ) => {
    notify(message, severity);
  };

  const handleCloseSnackbar = () => {
    // Notifications are auto-managed by NotificationManager
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
    setEditableUser((prevUser) =>
      prevUser ? ({ ...prevUser, [name]: value } as BasicUserInfo) : null,
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
    if (!editableUser) return;

    setSaving(true);
    clearFieldErrors();

    try {
      // Create payload with only the allowed fields
      const updatePayload: UpdateUserPayload = {
        name: editableUser.name,
        username: editableUser.username,
        mobileNumber: editableUser.mobileNumber,
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

      const response = await axios.put("/api/users/profile", updatePayload);

      if (response.data.success) {
        showSnackbar(
          response.data.message || "Profile updated successfully!",
          "success",
        );

        dispatch(
          updateUser({
            name: editableUser.name,
            username: editableUser.username,
            mobile: editableUser.mobileNumber,
            mobileNumber: editableUser.mobileNumber,
          }),
        );

        // Update local state with any sanitized data from the response if needed
        // Note: The API doesn't return the updated user, so we assume our local state is correct
        // If you want to be safe, you could refetch the user data here
      } else {
        // Handle API response that indicates failure but didn't throw error
        showSnackbar(
          response.data.message || "Failed to update profile",
          "error",
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
          "error",
        );
      } else {
        showSnackbar(
          "An unexpected error occurred. Please try again.",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const isProfileLoading = userLoading || !editableUser;

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
        <Tab label="Lead Distribution" />
        <Tab label="Units Settings" />
        <Tab label="Live Chat Setup" />
        <Tab label="Email Settings" />
        <Tab label="API Settings" />
        <Tab label="Stripe Onboarding" />
        <Tab label="Subscription" />
      </Tabs>

      {isProfileLoading ? (
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
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Avatar
                      sx={{ width: 80, height: 80, mb: 2 }}
                      src={editableUser?.image}
                      alt="Profile"
                    />
                    <Typography variant="body2" color="textSecondary">
                      Profile picture from your account
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={editableUser?.name || ""}
                        onChange={handleInputChange}
                        error={!!fieldErrors.name}
                        helperText={fieldErrors.name || "Your display name"}
                        disabled={saving}
                        placeholder="Enter your full name"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Username"
                        name="username"
                        value={editableUser?.username || ""}
                        onChange={handleInputChange}
                        error={!!fieldErrors.username}
                        helperText={
                          fieldErrors.username || "Your unique username"
                        }
                        disabled={saving}
                        placeholder="Choose a username"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="mobileNumber"
                        value={editableUser?.mobileNumber || ""}
                        onChange={handleInputChange}
                        error={!!fieldErrors.mobileNumber}
                        helperText={
                          fieldErrors.mobileNumber || "Your contact number"
                        }
                        disabled={saving}
                        placeholder="+1234567890"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        value={editableUser?.email || ""}
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
                    const resetToCurrentUser = async () => {
                      const latest = await refreshUser(true);
                      if (latest) {
                        setEditableUser({
                          _id: latest.id || "",
                          name: latest.name || "",
                          username: latest.username || "",
                          email: latest.email || "",
                          mobileNumber:
                            latest.mobileNumber || latest.mobile || "",
                          image: latest.image || "",
                        });
                        clearFieldErrors();
                        showSnackbar("Changes discarded", "info");
                      } else {
                        showSnackbar("Error resetting form", "error");
                      }
                    };

                    resetToCurrentUser();
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

      {tabValue === 1 && <LeadDistributionSettings />}
      {tabValue === 2 && <UnitPricingComponent />}
      {tabValue === 3 && <TawkSetupForm />}
      {tabValue === 4 && <EmailSettingsPage />}
      {tabValue === 5 && <APISettingsPage />}
      {tabValue === 6 && <StripeOnboardingPage />}
      {tabValue === 7 && (
        <Box>
          <SubscriptionManagement
            onOpenChangePlanModal={() => setChangePlanModalOpen(true)}
          />
          <Box sx={{ mt: 4 }}>
            <PaymentMethodsManager />
          </Box>
          <ChangePlanModal
            open={changePlanModalOpen}
            onClose={() => setChangePlanModalOpen(false)}
            onSuccess={() => {
              setChangePlanModalOpen(false);
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default AccountSettings;
