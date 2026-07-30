"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Tune as PreferencesIcon,
  Schedule as AvailabilityIcon,
  BarChart as LimitsIcon,
  Room as LocationIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInitializeUser } from "@/app/hooks";
import { useNotification } from "@/app/hooks";
import AccountSettings from "@/app/dashboard/buyer/settings/settings";
import {
  BUYER_ONBOARDING_STEPS,
  BuyerOnboardingStep,
  getBuyerOnboardingState,
  hydrateBuyerOnboardingFromServer,
  markBuyerOnboardingStepCompleted,
  markBuyerOnboardingStepSkipped,
  isBuyerOnboardingFlowComplete,
} from "@/lib/buyerOnboarding";

const stepMeta: Record<
  BuyerOnboardingStep,
  {
    label: string;
    icon: React.ReactElement;
    description: string;
    settingsTab: number;
  }
> = {
  general: {
    label: "General",
    icon: <PersonIcon />,
    description: "Complete your profile and company details.",
    settingsTab: 0,
  },
  preferences: {
    label: "Preferences",
    icon: <PreferencesIcon />,
    description: "Set lead preferences, industries, and distribution rules.",
    settingsTab: 1,
  },
  availability: {
    label: "Availability",
    icon: <AvailabilityIcon />,
    description: "Define working hours and weekly availability schedule.",
    settingsTab: 2,
  },
  limits: {
    label: "Volume & Limits",
    icon: <LimitsIcon />,
    description: "Configure budget, volume, and lead pricing limits.",
    settingsTab: 3,
  },
  location: {
    label: "Location",
    icon: <LocationIcon />,
    description: "Set preferred locations and matching flexibility.",
    settingsTab: 4,
  },
};

const BuyerOnboardingPage = () => {
  const router = useRouter();
  const notify = useNotification();
  const { status: sessionStatus } = useSession();
  const { currentUser, loading: userLoading } = useInitializeUser();

  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [stepSaveHandler, setStepSaveHandler] = useState<
    null | (() => Promise<boolean>)
  >(null);
  const [, bumpOnboardingStateRevision] = useReducer(
    (revision: number) => revision + 1,
    0,
  );

  // Pick up any progress recorded server-side (e.g. from another device or
  // browser) before this page's first synchronous read below.
  useEffect(() => {
    if (!currentUser?.email) return;
    hydrateBuyerOnboardingFromServer(currentUser.email).then(() => {
      bumpOnboardingStateRevision();
    });
  }, [currentUser?.email]);

  const activeStep = BUYER_ONBOARDING_STEPS[tabValue];

  const onboardingState = getBuyerOnboardingState(currentUser?.email);

  const { completedSteps, skippedSteps } = onboardingState;

  useEffect(() => {
    if (sessionStatus === "loading" || userLoading) return;

    if (!currentUser) {
      // An empty Redux store means "not fetched yet", not "signed out" — only
      // the session status can distinguish them. Treating it as signed-out
      // bounces an authenticated buyer to /auth/sign-in, which sends them
      // straight back here: a redirect loop.
      if (sessionStatus === "unauthenticated") {
        router.replace("/auth/sign-in");
      }
      return;
    }

    if (currentUser.role !== "buyer" && currentUser.role !== "staff") {
      if (currentUser.role === "admin") {
        router.replace("/admindashboard/overview");
      } else if (
        currentUser.role === "seller" ||
        currentUser.role === "business-admin"
      ) {
        router.replace("/dashboard/overview");
      } else {
        router.replace("/completeregistration");
      }
    }
  }, [sessionStatus, userLoading, currentUser, router]);

  const doneSteps = useMemo(
    () => new Set([...completedSteps, ...skippedSteps]),
    [completedSteps, skippedSteps],
  );

  const progressPercent = Math.round(
    (doneSteps.size / BUYER_ONBOARDING_STEPS.length) * 100,
  );

  const goToStep = (index: number) => {
    setTabValue(
      Math.max(0, Math.min(index, BUYER_ONBOARDING_STEPS.length - 1)),
    );
  };

  const registerStepSaveHandler = useCallback(
    (handler: () => Promise<boolean>) => {
      setStepSaveHandler(() => handler);
    },
    [],
  );

  const markStepCompleted = (step: BuyerOnboardingStep) => {
    if (!currentUser?.email) return;

    markBuyerOnboardingStepCompleted(currentUser.email, step);
    bumpOnboardingStateRevision();
  };

  const handleNext = async () => {
    if (!currentUser?.email) return;

    if (!stepSaveHandler) {
      notify("This step is not ready to save yet.", "warning");
      return;
    }

    setSaving(true);
    const ok = await stepSaveHandler();
    setSaving(false);

    if (!ok) {
      notify("Please fix the errors and try again.", "warning");
      return;
    }

    markStepCompleted(activeStep);

    if (tabValue < BUYER_ONBOARDING_STEPS.length - 1) {
      goToStep(tabValue + 1);
      return;
    }

    if (isBuyerOnboardingFlowComplete(currentUser.email)) {
      router.push("/dashboard/buyer/overview");
    }
  };

  const handlePrevious = () => {
    goToStep(tabValue - 1);
  };

  const handleSkipCurrentStep = () => {
    if (!currentUser?.email) return;

    markBuyerOnboardingStepSkipped(currentUser.email, activeStep);
    bumpOnboardingStateRevision();

    if (tabValue < BUYER_ONBOARDING_STEPS.length - 1) {
      goToStep(tabValue + 1);
    } else if (isBuyerOnboardingFlowComplete(currentUser.email)) {
      router.push("/dashboard/buyer/overview");
    }
  };

  const finishEnabled = tabValue === BUYER_ONBOARDING_STEPS.length - 1;

  const handleFinish = async () => {
    if (!currentUser?.email) return;

    if (!stepSaveHandler) {
      notify("This step is not ready to save yet.", "warning");
      return;
    }

    setSaving(true);
    const ok = await stepSaveHandler();
    setSaving(false);

    if (!ok) {
      notify("Please fix the errors and try again.", "warning");
      return;
    }

    markStepCompleted(activeStep);
    router.push("/dashboard/buyer/overview");
  };

  const handleStepSaved = (step: BuyerOnboardingStep) => {
    markStepCompleted(step);
  };

  if (userLoading || !currentUser) {
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
          Buyer Onboarding
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Complete setup in steps before you start using your buyer dashboard.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Chip
            color={finishEnabled ? "success" : "warning"}
            label={`${doneSteps.size}/${BUYER_ONBOARDING_STEPS.length} steps completed or skipped`}
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
          {BUYER_ONBOARDING_STEPS.map((step) => (
            <Tab
              key={step}
              icon={stepMeta[step].icon}
              iconPosition="start"
              label={stepMeta[step].label}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {stepMeta[activeStep].label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {stepMeta[activeStep].description}
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            Update this step below and click Next to save and continue.
          </Alert>

          <AccountSettings
            embeddedOnboarding
            forcedTab={stepMeta[activeStep].settingsTab}
            onboardingStep={activeStep}
            onOnboardingStepSaved={handleStepSaved}
            onSaveHandlerReady={registerStepSaveHandler}
          />

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
              {tabValue < BUYER_ONBOARDING_STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={saving}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  disabled={!finishEnabled}
                  onClick={handleFinish}
                >
                  Finish Onboarding
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default BuyerOnboardingPage;
