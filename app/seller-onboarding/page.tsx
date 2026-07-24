"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  Person as PersonIcon,
  Share as ShareIcon,
  AttachMoney as MoneyIcon,
  Email as EmailIcon,
  AccountBalance as StripeIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import UnitPricingComponent from "@/app/dashboard/seller/settings/unitsetting/page";
import StripeOnboardingPage from "@/app/dashboard/seller/settings/stripeonboarding/page";
import LeadDistributionSettings from "@/app/dashboard/seller/settings/leadsellersetting/page";
import EmailSettingsPage from "@/app/dashboard/seller/settings/emailsetting/page";
import { useInitializeUser, useAppDispatch } from "@/app/hooks";
import { updateUser } from "@/lib/userSlice";
import { useNotification } from "@/app/hooks";
import {
  SELLER_ONBOARDING_STEPS,
  SellerOnboardingStep,
  getSellerOnboardingState,
  hydrateSellerOnboardingFromServer,
  markSellerOnboardingStepCompleted,
  markSellerOnboardingStepSkipped,
  isSellerOnboardingFlowComplete,
} from "@/lib/sellerOnboarding";
import { useRouter } from "next/navigation";

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

const hasText = (value?: string) => Boolean(value && value.trim().length > 0);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isGeneralStepComplete = (user: BasicUserInfo | null) => {
  if (!user) return false;
  return (
    hasText(user.name) &&
    hasText(user.mobileNumber) &&
    hasText(user.businessName) &&
    hasText(user.businessEmail) &&
    hasText(user.businessPhone) &&
    hasText(user.businessWebsite) &&
    hasText(user.industryNiche) &&
    hasText(user.businessAddress?.addressLine1) &&
    hasText(user.businessAddress?.city) &&
    hasText(user.businessAddress?.country)
  );
};

const stepMeta: Record<
  SellerOnboardingStep,
  { label: string; icon: React.ReactElement }
> = {
  general: { label: "General", icon: <PersonIcon /> },
  "lead-distribution": { label: "Lead Distribution", icon: <ShareIcon /> },
  "units-settings": { label: "Units Settings", icon: <MoneyIcon /> },
  "email-settings": { label: "Email", icon: <EmailIcon /> },
  "stripe-onboarding": { label: "Stripe", icon: <StripeIcon /> },
};

const SellerOnboardingPage = () => {
  const dispatch = useAppDispatch();
  const notify = useNotification();
  const router = useRouter();
  const {
    currentUser,
    loading: userLoading,
    refreshUser,
  } = useInitializeUser();

  const [tabValue, setTabValue] = useState(0);
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
  const [completedSteps, setCompletedSteps] = useState<SellerOnboardingStep[]>(
    [],
  );
  const [skippedSteps, setSkippedSteps] = useState<SellerOnboardingStep[]>([]);
  const [leadDistributionSaveHandler, setLeadDistributionSaveHandler] =
    useState<null | (() => Promise<boolean>)>(null);
  const [unitSettingsSaveHandler, setUnitSettingsSaveHandler] = useState<
    null | (() => Promise<boolean>)
  >(null);
  const [emailSettingsSaveHandler, setEmailSettingsSaveHandler] = useState<
    null | (() => Promise<boolean>)
  >(null);
  const [stripeOnboardingSaveHandler, setStripeOnboardingSaveHandler] =
    useState<null | (() => Promise<boolean>)>(null);

  const registerLeadDistributionSaveHandler = useCallback(
    (handler: () => Promise<boolean>) => {
      setLeadDistributionSaveHandler(() => handler);
    },
    [],
  );

  const registerUnitSettingsSaveHandler = useCallback(
    (handler: () => Promise<boolean>) => {
      setUnitSettingsSaveHandler(() => handler);
    },
    [],
  );

  const registerEmailSettingsSaveHandler = useCallback(
    (handler: () => Promise<boolean>) => {
      setEmailSettingsSaveHandler(() => handler);
    },
    [],
  );

  const registerStripeOnboardingSaveHandler = useCallback(
    (handler: () => Promise<boolean>) => {
      setStripeOnboardingSaveHandler(() => handler);
    },
    [],
  );

  const registerStripeConnectionStatus = useCallback(
    (isFullyConnected: boolean) => {
      if (!isFullyConnected || !currentUser?.email) return;

      markSellerOnboardingStepCompleted(currentUser.email, "stripe-onboarding");

      setCompletedSteps((prev) =>
        prev.includes("stripe-onboarding")
          ? prev
          : [...prev, "stripe-onboarding"],
      );
      setSkippedSteps((prev) =>
        prev.includes("stripe-onboarding")
          ? prev.filter((step) => step !== "stripe-onboarding")
          : prev,
      );
    },
    [currentUser?.email],
  );

  const activeStep = SELLER_ONBOARDING_STEPS[tabValue];

  useEffect(() => {
    if (currentUser) {
      setEditableUser({
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
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const email = currentUser?.email;
    if (!email) return;

    // Pick up any progress recorded server-side (e.g. from another device
    // or browser) before reading local state.
    hydrateSellerOnboardingFromServer(email).then(() => {
      const state = getSellerOnboardingState(email);
      setCompletedSteps(state.completedSteps);
      setSkippedSteps(state.skippedSteps);
    });
  }, [currentUser?.email]);

  useEffect(() => {
    if (userLoading) return;
    if (!currentUser) {
      router.replace("/auth/sign-in");
      return;
    }

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
    }
  }, [userLoading, currentUser, router]);

  const doneSteps = useMemo(
    () => new Set([...completedSteps, ...skippedSteps]),
    [completedSteps, skippedSteps],
  );

  const progressPercent = Math.round(
    (doneSteps.size / SELLER_ONBOARDING_STEPS.length) * 100,
  );

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

    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
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

  const saveGeneralInfo = async () => {
    if (!editableUser) return false;

    setSaving(true);
    setFieldErrors({});

    try {
      const updatePayload: UpdateUserPayload = {
        name: editableUser.name,
        mobileNumber: editableUser.mobileNumber,
        businessName: editableUser.businessName,
        businessEmail: editableUser.businessEmail,
        businessPhone: editableUser.businessPhone,
        businessWebsite: editableUser.businessWebsite,
        companyDescription: editableUser.companyDescription,
        industryNiche: editableUser.industryNiche,
        businessAddress: editableUser.businessAddress,
      };

      const response = await axios.put("/api/users/profile", updatePayload);

      if (response.data.success) {
        notify("General information saved", "success");
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
        await refreshUser(true);

        if (currentUser?.email) {
          markSellerOnboardingStepCompleted(currentUser.email, "general");
          setCompletedSteps((prev) =>
            prev.includes("general") ? prev : [...prev, "general"],
          );
          setSkippedSteps((prev) => prev.filter((step) => step !== "general"));
        }

        return true;
      }

      notify(response.data.message || "Failed to save profile", "error");
      return false;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        isStringArray(
          (error as { response?: { data?: { errors?: unknown } } }).response
            ?.data?.errors,
        )
      ) {
        const validationErrors = (
          error as { response?: { data?: { errors?: string[] } } }
        ).response?.data?.errors;
        setFieldErrors(extractFieldErrors(validationErrors ?? []));
      }
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || "Failed to save profile information"
          : "Failed to save profile information";
      notify(errorMessage, "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goToStep = (index: number) => {
    setTabValue(
      Math.max(0, Math.min(index, SELLER_ONBOARDING_STEPS.length - 1)),
    );
  };

  const handleNext = async () => {
    if (!currentUser?.email) return;

    const currentStep = activeStep;

    if (currentStep === "general") {
      const ok = await saveGeneralInfo();
      if (!ok) return;

      if (!isGeneralStepComplete(editableUser)) {
        notify("Please complete the required general fields", "warning");
        return;
      }
    } else if (currentStep === "lead-distribution") {
      if (!leadDistributionSaveHandler) {
        notify("Lead Distribution settings are not ready yet", "warning");
        return;
      }

      setSaving(true);
      const ok = await leadDistributionSaveHandler();
      setSaving(false);

      if (!ok) return;
    } else if (currentStep === "units-settings") {
      if (!unitSettingsSaveHandler) {
        notify("Units settings are not ready yet", "warning");
        return;
      }

      setSaving(true);
      const ok = await unitSettingsSaveHandler();
      setSaving(false);

      if (!ok) return;
    } else if (currentStep === "email-settings") {
      if (!emailSettingsSaveHandler) {
        notify("Email settings are not ready yet", "warning");
        return;
      }

      setSaving(true);
      const ok = await emailSettingsSaveHandler();
      setSaving(false);

      if (!ok) return;
    } else if (currentStep === "stripe-onboarding") {
      if (!stripeOnboardingSaveHandler) {
        notify("Stripe onboarding status is not ready yet", "warning");
        return;
      }

      setSaving(true);
      const ok = await stripeOnboardingSaveHandler();
      setSaving(false);

      if (!ok) return;
    }

    if (currentStep !== "general") {
      markSellerOnboardingStepCompleted(currentUser.email, currentStep);
      setCompletedSteps((prev) =>
        prev.includes(currentStep) ? prev : [...prev, currentStep],
      );
      setSkippedSteps((prev) => prev.filter((step) => step !== currentStep));
    }

    if (tabValue < SELLER_ONBOARDING_STEPS.length - 1) {
      goToStep(tabValue + 1);
    } else {
      if (isSellerOnboardingFlowComplete(currentUser.email)) {
        router.push("/dashboard/seller/overview");
      } else {
        notify(
          "Complete or skip the remaining steps to finish onboarding",
          "info",
        );
      }
    }
  };

  const handlePrevious = () => {
    goToStep(tabValue - 1);
  };

  const handleSkipCurrentStep = () => {
    if (!currentUser?.email) return;

    const currentStep = activeStep;
    if (currentStep === "stripe-onboarding") {
      markSellerOnboardingStepCompleted(currentUser.email, currentStep);
      setCompletedSteps((prev) =>
        prev.includes(currentStep) ? prev : [...prev, currentStep],
      );
      setSkippedSteps((prev) => prev.filter((step) => step !== currentStep));
    } else {
      markSellerOnboardingStepSkipped(currentUser.email, currentStep);
      setSkippedSteps((prev) =>
        prev.includes(currentStep) ? prev : [...prev, currentStep],
      );
    }

    if (tabValue < SELLER_ONBOARDING_STEPS.length - 1) {
      goToStep(tabValue + 1);
    } else if (isSellerOnboardingFlowComplete(currentUser.email)) {
      router.push("/dashboard/seller/overview");
    }
  };

  const finishEnabled = currentUser?.email
    ? isSellerOnboardingFlowComplete(currentUser.email)
    : false;

  if (userLoading || !editableUser) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Seller Onboarding
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Complete setup in steps before you start using your seller dashboard.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Chip
            color={finishEnabled ? "success" : "warning"}
            label={`${doneSteps.size}/${SELLER_ONBOARDING_STEPS.length} steps completed or skipped`}
          />
          <Typography variant="body2" color="text.secondary">
            {progressPercent}% complete
          </Typography>
        </Box>
        <LinearProgress value={progressPercent} variant="determinate" />
      </Paper>

      <Paper
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <Tabs
          value={tabValue}
          onChange={(e, value) => goToStep(value)}
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
          {SELLER_ONBOARDING_STEPS.map((step) => (
            <Tab
              key={step}
              icon={stepMeta[step].icon}
              iconPosition="start"
              label={stepMeta[step].label}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 4 }}>
          {activeStep === "general" && (
            <Card
              elevation={0}
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="600">
                  Business Profile
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Fill your core business details. Clicking Next saves this step
                  automatically.
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
                        src={editableUser.image}
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
                          value={editableUser.name || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.name}
                          helperText={fieldErrors.name || "Your display name"}
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          name="mobileNumber"
                          value={editableUser.mobileNumber || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.mobileNumber}
                          helperText={
                            fieldErrors.mobileNumber || "Your contact number"
                          }
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Company Name"
                          name="businessName"
                          value={editableUser.businessName || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.businessName}
                          helperText={
                            fieldErrors.businessName ||
                            "Your business/company name"
                          }
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Business Email"
                          name="businessEmail"
                          value={editableUser.businessEmail || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.businessEmail}
                          helperText={
                            fieldErrors.businessEmail || "Public-facing email"
                          }
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Business Phone"
                          name="businessPhone"
                          value={editableUser.businessPhone || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.businessPhone}
                          helperText={
                            fieldErrors.businessPhone || "Public-facing phone"
                          }
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Business Website"
                          name="businessWebsite"
                          value={editableUser.businessWebsite || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.businessWebsite}
                          helperText={
                            fieldErrors.businessWebsite || "Include https://"
                          }
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Industry / Niche"
                          name="industryNiche"
                          value={editableUser.industryNiche || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.industryNiche}
                          helperText={
                            fieldErrors.industryNiche || "Primary market focus"
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
                            editableUser.businessAddress?.addressLine1 || ""
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
                          label="City"
                          name="businessAddress.city"
                          value={editableUser.businessAddress?.city || ""}
                          onChange={handleInputChange}
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Country"
                          name="businessAddress.country"
                          value={editableUser.businessAddress?.country || ""}
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
                          value={editableUser.companyDescription || ""}
                          onChange={handleInputChange}
                          error={!!fieldErrors.companyDescription}
                          helperText={
                            fieldErrors.companyDescription ||
                            "Short company overview"
                          }
                          disabled={saving}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          value={editableUser.email || ""}
                          disabled
                          helperText="Email cannot be changed after account creation"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {activeStep === "lead-distribution" && (
            <LeadDistributionSettings
              hideSaveButton
              onSaveHandlerReady={registerLeadDistributionSaveHandler}
            />
          )}
          {activeStep === "units-settings" && (
            <UnitPricingComponent
              onSaveHandlerReady={registerUnitSettingsSaveHandler}
            />
          )}
          {activeStep === "email-settings" && (
            <EmailSettingsPage
              hideSaveButton
              onSaveHandlerReady={registerEmailSettingsSaveHandler}
            />
          )}
          {activeStep === "stripe-onboarding" && (
            <StripeOnboardingPage
              onSaveHandlerReady={registerStripeOnboardingSaveHandler}
              onConnectionStatusChange={registerStripeConnectionStatus}
            />
          )}

          <Divider sx={{ my: 3 }} />
          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={tabValue === 0 || saving}
            >
              Previous
            </Button>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="text"
                onClick={handleSkipCurrentStep}
                disabled={saving}
              >
                Skip this step
              </Button>
              {tabValue < SELLER_ONBOARDING_STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={saving}
                  startIcon={
                    saving ? <CircularProgress size={16} /> : undefined
                  }
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  disabled={!finishEnabled || saving}
                  onClick={() => router.push("/dashboard/seller/overview")}
                >
                  Finish Onboarding
                </Button>
              )}
            </Box>
          </Box>

          {activeStep !== "general" && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Click Next to save this step automatically, or Skip this step for
              now.
            </Alert>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default SellerOnboardingPage;
