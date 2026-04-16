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
  Paper,
  Card,
  CardContent,
  Divider,
  Chip,
  Container,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Share as ShareIcon,
  AttachMoney as MoneyIcon,
  Email as EmailIcon,
  Code as CodeIcon,
  AccountBalance as StripeIcon,
  CreditCard as SubscriptionIcon,
} from "@mui/icons-material";
import UnitPricingComponent from "./unitsetting/page";
import { useRouter } from "next/navigation";
import StripeOnboardingPage from "./stripeonboarding/page";
import LeadDistributionSettings from "./leadsellersetting/page";
import EmailSettingsPage from "./emailsetting/page";
import APISettingsPage from "./apisetting/page";
import SubscriptionManagement from "./subscription/SubscriptionManagement";
import ChangePlanModal from "./subscription/ChangePlanModal";
import dynamic from "next/dynamic";
import { useInitializeUser, useAppDispatch } from "@/app/hooks";

const PaymentMethodsManager = dynamic(
  () => import("./subscription/PaymentMethodsManager"),
  { ssr: false },
);
import { updateUser } from "@/lib/userSlice";
import { useNotification } from "@/app/hooks";

// Interface for the minimal user data needed
interface BasicUserInfo {
  _id?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  companyDescription?: string;
  industryNiche?: string;
  businessAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postCode?: string;
  };
  image?: string;
}

interface ApiError {
  message: string;
  error?: string;
  errors?: string[];
  status: number;
  success: boolean;
}

// Interface for update payload - only allowed fields
interface UpdateUserPayload {
  name?: string;
  mobileNumber?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  companyDescription?: string;
  industryNiche?: string;
  businessAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postCode?: string;
  };
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
    mobileNumber?: string;
    businessName?: string;
    businessEmail?: string;
    businessPhone?: string;
    businessWebsite?: string;
    companyDescription?: string;
    industryNiche?: string;
    businessAddress?: string;
  }>({});
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);

  const router = useRouter();
  const tabMap = [
    "general",
    "lead-distribution",
    "units-settings",
    "email-settings",
    // "api-settings",
    "stripe-onboarding",
    "subscription",
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const rawTabParam = url.searchParams.get("tab");
      let tabParam = rawTabParam;
      let onboardingStatusFromTab: string | null = null;

      if (tabParam?.startsWith("stripe_onboarding")) {
        const parts = tabParam.split("=");
        onboardingStatusFromTab = parts[1] || null;
        tabParam = "stripe-onboarding";
      }

      const index = tabMap.indexOf(tabParam || "general");
      setTabValue(index >= 0 ? index : 0);

      if (
        onboardingStatusFromTab &&
        !url.searchParams.get("stripe_onboarding")
      ) {
        url.searchParams.set("tab", "stripe-onboarding");
        url.searchParams.set("stripe_onboarding", onboardingStatusFromTab);
        window.history.replaceState({}, "", url);
      }
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
        email: currentUser.email || "",
        mobileNumber: currentUser.mobileNumber || currentUser.mobile || "",
        businessName: currentUser.businessName || "",
        businessEmail: currentUser.businessEmail || "",
        businessPhone: currentUser.businessPhone || "",
        businessWebsite: currentUser.businessWebsite || "",
        companyDescription: currentUser.companyDescription || "",
        industryNiche: currentUser.industryNiche || "",
        businessAddress: {
          addressLine1: currentUser.businessAddress?.addressLine1 || "",
          addressLine2: currentUser.businessAddress?.addressLine2 || "",
          city: currentUser.businessAddress?.city || "",
          state: currentUser.businessAddress?.state || "",
          country: currentUser.businessAddress?.country || "",
          postCode: currentUser.businessAddress?.postCode || "",
        },
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

    if (name.startsWith("businessAddress.")) {
      const addressKey = name.split(".")[1] as keyof NonNullable<
        BasicUserInfo["businessAddress"]
      >;

      setEditableUser((prevUser) =>
        prevUser
          ? ({
              ...prevUser,
              businessAddress: {
                ...(prevUser.businessAddress || {}),
                [addressKey]: value,
              },
            } as BasicUserInfo)
          : null,
      );
    } else {
      setEditableUser((prevUser) =>
        prevUser ? ({ ...prevUser, [name]: value } as BasicUserInfo) : null,
      );
    }

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
      } else if (
        error.toLowerCase().includes("phone") ||
        error.toLowerCase().includes("mobile")
      ) {
        errors.mobileNumber = error;
      } else if (error.toLowerCase().includes("business email")) {
        errors.businessEmail = error;
      } else if (error.toLowerCase().includes("website")) {
        errors.businessWebsite = error;
      } else if (error.toLowerCase().includes("industry")) {
        errors.industryNiche = error;
      } else if (error.toLowerCase().includes("address")) {
        errors.businessAddress = error;
      }
    });

    return errors;
  };

  const handleSaveChanges = async () => {
    if (!editableUser) return;

    setSaving(true);
    clearFieldErrors();

    try {
      const toOptional = (value?: string) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };

      const sanitizedAddress = editableUser.businessAddress
        ? {
            addressLine1: toOptional(editableUser.businessAddress.addressLine1),
            addressLine2: toOptional(editableUser.businessAddress.addressLine2),
            city: toOptional(editableUser.businessAddress.city),
            state: toOptional(editableUser.businessAddress.state),
            country: toOptional(editableUser.businessAddress.country),
            postCode: toOptional(editableUser.businessAddress.postCode),
          }
        : undefined;

      const hasAddressValues = Boolean(
        sanitizedAddress && Object.values(sanitizedAddress).some(Boolean),
      );

      // Create payload with only allowed, non-empty fields
      const updatePayload: UpdateUserPayload = {
        name: toOptional(editableUser.name),
        mobileNumber: toOptional(editableUser.mobileNumber),
        businessName: toOptional(editableUser.businessName),
        businessEmail: toOptional(editableUser.businessEmail),
        businessPhone: toOptional(editableUser.businessPhone),
        businessWebsite: toOptional(editableUser.businessWebsite),
        companyDescription: toOptional(editableUser.companyDescription),
        industryNiche: toOptional(editableUser.industryNiche),
        businessAddress: hasAddressValues ? sanitizedAddress : undefined,
      };

      // Remove undefined keys
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
          response.data.data?.message ||
            response.data.message ||
            "Profile updated successfully!",
          "success",
        );

        dispatch(
          updateUser({
            name: editableUser.name,
            mobile: editableUser.mobileNumber,
            mobileNumber: editableUser.mobileNumber,
            businessName: editableUser.businessName,
            businessEmail: editableUser.businessEmail,
            businessPhone: editableUser.businessPhone,
            businessWebsite: editableUser.businessWebsite,
            companyDescription: editableUser.companyDescription,
            industryNiche: editableUser.industryNiche,
            businessAddress: editableUser.businessAddress,
          }),
        );

        const latest = await refreshUser(true);
        if (latest) {
          setEditableUser({
            _id: latest.id || "",
            name: latest.name || "",
            email: latest.email || "",
            mobileNumber: latest.mobileNumber || latest.mobile || "",
            businessName: latest.businessName || "",
            businessEmail: latest.businessEmail || "",
            businessPhone: latest.businessPhone || "",
            businessWebsite: latest.businessWebsite || "",
            companyDescription: latest.companyDescription || "",
            industryNiche: latest.industryNiche || "",
            businessAddress: {
              addressLine1: latest.businessAddress?.addressLine1 || "",
              addressLine2: latest.businessAddress?.addressLine2 || "",
              city: latest.businessAddress?.city || "",
              state: latest.businessAddress?.state || "",
              country: latest.businessAddress?.country || "",
              postCode: latest.businessAddress?.postCode || "",
            },
            image: latest.image || "",
          });
        }
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
        showSnackbar(
          errorData.message || errorData.error || "Failed to update profile",
          "error",
        );

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <SettingsIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h4" component="h1" fontWeight="600">
            Settings
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 2,
            "& .MuiTab-root": {
              minHeight: 64,
              textTransform: "none",
              fontSize: "0.95rem",
              fontWeight: 500,
            },
          }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="General" />
          <Tab
            icon={<ShareIcon />}
            iconPosition="start"
            label="Lead Distribution"
          />
          <Tab
            icon={<MoneyIcon />}
            iconPosition="start"
            label="Units Settings"
          />
          <Tab icon={<EmailIcon />} iconPosition="start" label="Email" />
          {/* <Tab icon={<CodeIcon />} iconPosition="start" label="API Keys" /> */}
          <Tab icon={<StripeIcon />} iconPosition="start" label="Stripe" />
          <Tab
            icon={<SubscriptionIcon />}
            iconPosition="start"
            label="Subscription"
          />
        </Tabs>

        {isProfileLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={400}
            sx={{ p: 4 }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ p: 4 }}>
            {tabValue === 0 && (
              <Box>
                <Card
                  elevation={0}
                  sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="600">
                      Profile Information
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      Update your account profile information and contact
                      details
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Avatar
                            sx={{ width: 120, height: 120, boxShadow: 2 }}
                            src={editableUser?.image}
                            alt="Profile"
                          />
                          <Chip
                            label="Connected Account"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <Grid container spacing={2.5}>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Full Name"
                              name="name"
                              value={editableUser?.name || ""}
                              onChange={handleInputChange}
                              error={!!fieldErrors.name}
                              helperText={
                                fieldErrors.name || "Your display name"
                              }
                              disabled={saving}
                              placeholder="Enter your full name"
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
                                fieldErrors.mobileNumber ||
                                "Your contact number"
                              }
                              disabled={saving}
                              placeholder="+1234567890"
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Company Name"
                              name="businessName"
                              value={editableUser?.businessName || ""}
                              onChange={handleInputChange}
                              error={!!fieldErrors.businessName}
                              helperText={
                                fieldErrors.businessName ||
                                "Your business or company name"
                              }
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="Business Email"
                              name="businessEmail"
                              value={editableUser?.businessEmail || ""}
                              onChange={handleInputChange}
                              error={!!fieldErrors.businessEmail}
                              helperText={
                                fieldErrors.businessEmail ||
                                "Public-facing business email"
                              }
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="Business Phone"
                              name="businessPhone"
                              value={editableUser?.businessPhone || ""}
                              onChange={handleInputChange}
                              error={!!fieldErrors.businessPhone}
                              helperText={
                                fieldErrors.businessPhone ||
                                "Public-facing business phone"
                              }
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Business Website"
                              name="businessWebsite"
                              value={editableUser?.businessWebsite || ""}
                              onChange={handleInputChange}
                              error={!!fieldErrors.businessWebsite}
                              helperText={
                                fieldErrors.businessWebsite ||
                                "Include https://"
                              }
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="Industry / Niche"
                              name="industryNiche"
                              value={editableUser?.industryNiche || ""}
                              onChange={handleInputChange}
                              error={!!fieldErrors.industryNiche}
                              helperText={
                                fieldErrors.industryNiche ||
                                "Your primary market focus"
                              }
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="Address Line 1"
                              name="businessAddress.addressLine1"
                              value={
                                editableUser?.businessAddress?.addressLine1 ||
                                ""
                              }
                              onChange={handleInputChange}
                              error={!!fieldErrors.businessAddress}
                              helperText={
                                fieldErrors.businessAddress || "Street address"
                              }
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="Address Line 2"
                              name="businessAddress.addressLine2"
                              value={
                                editableUser?.businessAddress?.addressLine2 ||
                                ""
                              }
                              onChange={handleInputChange}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="City"
                              name="businessAddress.city"
                              value={editableUser?.businessAddress?.city || ""}
                              onChange={handleInputChange}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="State"
                              name="businessAddress.state"
                              value={editableUser?.businessAddress?.state || ""}
                              onChange={handleInputChange}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="Country"
                              name="businessAddress.country"
                              value={
                                editableUser?.businessAddress?.country || ""
                              }
                              onChange={handleInputChange}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              label="Postal Code"
                              name="businessAddress.postCode"
                              value={
                                editableUser?.businessAddress?.postCode || ""
                              }
                              onChange={handleInputChange}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              multiline
                              minRows={3}
                              label="Company Description"
                              name="companyDescription"
                              value={editableUser?.companyDescription || ""}
                              onChange={handleInputChange}
                              error={!!fieldErrors.companyDescription}
                              helperText={
                                fieldErrors.companyDescription ||
                                "Short overview of your company"
                              }
                              disabled={saving}
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Email Address"
                              name="email"
                              value={editableUser?.email || ""}
                              disabled
                              helperText="Email cannot be changed after account creation"
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <Divider />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      p: 2.5,
                      gap: 2,
                      bgcolor: "grey.50",
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
                              email: latest.email || "",
                              mobileNumber:
                                latest.mobileNumber || latest.mobile || "",
                              businessName: latest.businessName || "",
                              businessEmail: latest.businessEmail || "",
                              businessPhone: latest.businessPhone || "",
                              businessWebsite: latest.businessWebsite || "",
                              companyDescription:
                                latest.companyDescription || "",
                              industryNiche: latest.industryNiche || "",
                              businessAddress: {
                                addressLine1:
                                  latest.businessAddress?.addressLine1 || "",
                                addressLine2:
                                  latest.businessAddress?.addressLine2 || "",
                                city: latest.businessAddress?.city || "",
                                state: latest.businessAddress?.state || "",
                                country: latest.businessAddress?.country || "",
                                postCode:
                                  latest.businessAddress?.postCode || "",
                              },
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
                      Reset Changes
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleSaveChanges}
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={20} /> : null}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </Box>
                </Card>
              </Box>
            )}

            {tabValue === 1 && <LeadDistributionSettings />}
            {tabValue === 2 && <UnitPricingComponent />}
            {tabValue === 3 && <EmailSettingsPage />}
            {/* {tabValue === 4 && <APISettingsPage />} */}
            {tabValue === 4 && <StripeOnboardingPage />}
            {tabValue === 5 && (
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
        )}
      </Paper>
    </Container>
  );
};

export default AccountSettings;
