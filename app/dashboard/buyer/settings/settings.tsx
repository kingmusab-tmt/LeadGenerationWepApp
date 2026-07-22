"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "@/lib/axiosInstance";
import { useRouter, useSearchParams } from "next/navigation";
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
  FormControlLabel,
  Paper,
  Container,
  Card,
  CardContent,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/system";
import { industryNiches } from "@/utils/industryNiches";
import { industryServices } from "@/utils/industryServices";

import { useInitializeUser, useAppDispatch, normalizeUser } from "@/app/hooks";
import { setUser, updateUser } from "@/lib/userSlice";
import { useNotification } from "@/app/hooks";
import GooglePlacesAutocomplete from "@/app/components/GooglePlacesAutocomplete";
import GoogleTimezoneAutocomplete from "@/app/components/GoogleTimezoneAutocomplete";
import { useColorMode } from "@/lib/theme/MuiThemeProvider";
import {
  BUYER_ONBOARDING_STEPS,
  BuyerOnboardingStep,
  markBuyerOnboardingStepCompleted,
} from "@/lib/buyerOnboarding";
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Tune as PreferencesIcon,
  Schedule as AvailabilityIcon,
  BarChart as LimitsIcon,
  Room as LocationIcon,
} from "@mui/icons-material";

const Section = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  border: "1px solid",
  borderColor: theme.palette.divider,
  boxShadow: "none",
  borderRadius: theme.shape.borderRadius,
}));

const SectionBody = styled(CardContent)(({ theme }) => ({
  padding: theme.spacing(3),
  "&:last-child": {
    paddingBottom: theme.spacing(3),
  },
}));

const SectionHeader = styled(Typography)(({ theme }) => ({
  fontSize: "1rem",
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

const notificationPreferencesOptions = ["Email", "SMS", "In-App Notification"];

interface ILeadBuyerDetail {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  preferredDistribution: string;
  notificationPreferences: string[];
  status: string;
  timezone?: string;
  businessDescription?: string;
  companyRegNo?: string;
  vatTaxRegNo?: string;
  businessWebsite?: string;
  contactAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postCode?: string;
  };
  leadPreferences: {
    location: string;
    industry: string;
    industries?: string[];
    industryServicePairs?: { industry: string; services: string[] }[];
  };
  registeredWith: string;
  walletUnit: number;
  workingHours?: { start: string; end: string };
  budgetCapType?: "daily" | "weekly" | "monthly";
  budgetLimitAmount?: number;
  volumeLimitCount?: number;
  maxConcurrentLeads?: number;
  maxPricePerLead?: number;
  maxLeadsPerDay?: number;
  autoAcceptMatchingLeads?: boolean;
  qualificationScoreMinimum?: number;
  acceptOnlyDuringBusinessHours?: boolean;
  notifyOnWeekends?: boolean;
  weeklySchedule?: {
    [key: string]: { enabled: boolean; start: string; end: string };
  };
  vacationMode?: { enabled: boolean; pauseUntil?: Date; autoReject: boolean };
  locationMatchingStrict?: boolean;
  preferredZones?: { city?: string; state?: string; zipCodes?: string[] }[];
  leadTypes?: ("exclusive" | "shared")[];
  webhookConfig?: { enabled?: boolean; url?: string; authToken?: string };
  serviceLocations?: {
    city: string;
    state: string;
    country: string;
    zipCodes?: string[];
    radius?: number;
  }[];
  maxLeadAge?: number;
  preferredContactMethods?: ("phone" | "email" | "sms")[];
  priorityBySource?: { source: string; priority: number }[];
  priorityByIndustry?: { industry: string; priority: number }[];
  priorityByLocation?: { location: string; priority: number }[];
}

interface BuyerPreferences {
  timezone: string;
  preferredDistribution: "Automatic" | "Manual" | "Both";
  industries: string[];
  industryServicePairs: { industry: string; services: string[] }[];
  budgetCapType: "daily" | "weekly" | "monthly";
  budgetLimitAmount: number;
  volumeLimitCount: number;
  maxConcurrentLeads: number;
  maxPricePerLead: number;
  maxLeadsPerDay: number;
  qualificationScoreMinimum: number;
  acceptOnlyDuringBusinessHours: boolean;
  workingHours: { start: string; end: string };
  notifyOnWeekends: boolean;
  vacationMode: { enabled: boolean; pauseUntil?: string; autoReject: boolean };
  locationMatchingStrict: boolean;
  preferredZones: { city?: string; state?: string; zipCodes?: string[] }[];
  preferenceMatchingThreshold: "strict" | "moderate" | "flexible";
  leadTypes: ("exclusive" | "shared")[];
  webhookConfig: { enabled: boolean; url: string; authToken: string };
  serviceLocations: {
    city: string;
    state: string;
    country: string;
    zipCodes?: string[];
    radius?: number;
  }[];
  autoAcceptMatchingLeads: boolean;
  acceptCallLeads: boolean;
  weeklySchedule: {
    [key: string]: { enabled: boolean; start: string; end: string };
  };
  maxLeadAge: number;
  preferredContactMethods: ("phone" | "email" | "sms")[];
  priorityBySource: { source: string; priority: number }[];
  priorityByIndustry: { industry: string; priority: number }[];
  priorityByLocation: { location: string; priority: number }[];
}

interface PreferredZone {
  city?: string;
  state?: string;
  zipCodes?: string[];
}

interface AccountSettingsProps {
  embeddedOnboarding?: boolean;
  forcedTab?: number;
  onboardingStep?: BuyerOnboardingStep;
  onOnboardingStepSaved?: (step: BuyerOnboardingStep) => void;
  onSaveHandlerReady?: ((saveHandler: () => Promise<boolean>) => void) | null;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
  embeddedOnboarding = false,
  forcedTab,
  onboardingStep,
  onOnboardingStepSaved,
  onSaveHandlerReady,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const notify = useNotification();
  const {
    currentUser,
    loading: userLoading,
    refreshUser,
  } = useInitializeUser();
  const { mode: colorMode, toggleTheme: toggleColorMode } = useColorMode();

  // Initialize tab from URL search params, default to 0
  const tabParam = searchParams.get("tab");
  const initialTab =
    typeof forcedTab === "number"
      ? forcedTab
      : tabParam
        ? parseInt(tabParam, 10)
        : 0;
  const fromOnboarding =
    embeddedOnboarding || searchParams.get("fromOnboarding") === "1";
  const onboardingStepParam =
    onboardingStep || searchParams.get("onboardingStep");
  const [tabValue, setTabValue] = useState(initialTab);

  const [leadBuyerDetail, setLeadBuyerDetail] =
    useState<ILeadBuyerDetail | null>(null);
  const [leadBuyerLoading, setLeadBuyerLoading] = useState(true);
  const [preferences, setPreferences] = useState<BuyerPreferences | null>(null);
  const [preferredCitiesInput, setPreferredCitiesInput] = useState("");
  const [preferredStatesInput, setPreferredStatesInput] = useState("");
  const [preferredZipsInput, setPreferredZipsInput] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const industryOptions = industryNiches.map((industry) =>
    typeof industry === "string" ? industry : industry.value || industry.label,
  );

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLeadBuyerLoading(true);
        const response = await axios.get("/api/users");
        const normalized = normalizeUser(response.data);
        dispatch(setUser(normalized));
        const buyerDetail = response.data.leadbuyerDetail || null;
        setLeadBuyerDetail(buyerDetail);

        if (buyerDetail) {
          setPreferences({
            timezone: buyerDetail.timezone || "America/New_York",
            preferredDistribution:
              buyerDetail.preferredDistribution || "Manual",
            industries: buyerDetail.leadPreferences?.industries || [],
            industryServicePairs:
              buyerDetail.leadPreferences?.industryServicePairs || [],
            budgetCapType: buyerDetail.budgetCapType || "daily",
            budgetLimitAmount: buyerDetail.budgetLimitAmount ?? 0,
            volumeLimitCount: buyerDetail.volumeLimitCount ?? 0,
            maxConcurrentLeads: buyerDetail.maxConcurrentLeads ?? 0,
            maxPricePerLead: buyerDetail.maxPricePerLead ?? 0,
            maxLeadsPerDay: buyerDetail.maxLeadsPerDay ?? 10,
            autoAcceptMatchingLeads:
              buyerDetail.autoAcceptMatchingLeads ?? false,
            acceptCallLeads: buyerDetail.acceptCallLeads !== false,
            qualificationScoreMinimum:
              buyerDetail.qualificationScoreMinimum ?? 0,
            acceptOnlyDuringBusinessHours:
              buyerDetail.acceptOnlyDuringBusinessHours ?? false,
            workingHours:
              buyerDetail.workingHours ||
              ({
                start: "09:00",
                end: "17:00",
              } as { start: string; end: string }),
            notifyOnWeekends: buyerDetail.notifyOnWeekends ?? true,
            vacationMode: buyerDetail.vacationMode
              ? {
                  enabled: buyerDetail.vacationMode.enabled,
                  autoReject: buyerDetail.vacationMode.autoReject,
                  pauseUntil: buyerDetail.vacationMode.pauseUntil
                    ? new Date(buyerDetail.vacationMode.pauseUntil)
                        .toISOString()
                        .slice(0, 10)
                    : "",
                }
              : { enabled: false, autoReject: true, pauseUntil: "" },
            locationMatchingStrict: buyerDetail.locationMatchingStrict ?? false,
            preferredZones: buyerDetail.preferredZones || [],
            preferenceMatchingThreshold:
              buyerDetail.preferenceMatchingThreshold || "moderate",
            leadTypes: buyerDetail.leadTypes || ["shared"],
            webhookConfig:
              buyerDetail.webhookConfig ||
              ({ enabled: false, url: "", authToken: "" } as {
                enabled: boolean;
                url: string;
                authToken: string;
              }),
            serviceLocations: buyerDetail.serviceLocations || [],
            weeklySchedule:
              buyerDetail.weeklySchedule &&
              typeof buyerDetail.weeklySchedule === "object"
                ? buyerDetail.weeklySchedule
                : {
                    Monday: { enabled: true, start: "09:00", end: "17:00" },
                    Tuesday: { enabled: true, start: "09:00", end: "17:00" },
                    Wednesday: { enabled: true, start: "09:00", end: "17:00" },
                    Thursday: { enabled: true, start: "09:00", end: "17:00" },
                    Friday: { enabled: true, start: "09:00", end: "17:00" },
                    Saturday: { enabled: false, start: "09:00", end: "17:00" },
                    Sunday: { enabled: false, start: "09:00", end: "17:00" },
                  },
            maxLeadAge: buyerDetail.maxLeadAge ?? 24,
            preferredContactMethods: buyerDetail.preferredContactMethods || [
              "phone",
              "email",
            ],
            priorityBySource: buyerDetail.priorityBySource || [],
            priorityByIndustry: buyerDetail.priorityByIndustry || [],
            priorityByLocation: buyerDetail.priorityByLocation || [],
          });

          // Parse preferred zones
          const preferredCityZones = (buyerDetail.preferredZones || [])
            .filter((zone: PreferredZone) => zone.city)
            .map((zone: PreferredZone) => zone.city)
            .filter(Boolean);
          const preferredStateZones = (buyerDetail.preferredZones || [])
            .filter((zone: PreferredZone) => zone.state)
            .map((zone: PreferredZone) => zone.state)
            .filter(Boolean);
          const preferredZipZones = (buyerDetail.preferredZones || [])
            .flatMap((zone: PreferredZone) => zone.zipCodes || [])
            .filter(Boolean);
          setPreferredCitiesInput(preferredCityZones.join(", "));
          setPreferredStatesInput(preferredStateZones.join(", "));
          setPreferredZipsInput(preferredZipZones.join(", "));
        }
      } catch (error) {
        console.error("Error fetching user details", error);
      } finally {
        setLeadBuyerLoading(false);
      }
    };
    if (!leadBuyerDetail) {
      fetchUserDetails();
    }
  }, [dispatch, leadBuyerDetail]);

  // Sync tab value with URL search params (for browser back/forward navigation)
  useEffect(() => {
    if (embeddedOnboarding) return;
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const tabIndex = parseInt(tabParam, 10);
      if (tabIndex >= 0 && tabIndex <= 4 && tabIndex !== tabValue) {
        setTabValue(tabIndex);
      }
    }
  }, [searchParams, tabValue, embeddedOnboarding]);

  useEffect(() => {
    if (!embeddedOnboarding || typeof forcedTab !== "number") return;
    if (tabValue !== forcedTab) {
      setTabValue(forcedTab);
    }
  }, [embeddedOnboarding, forcedTab, tabValue]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (embeddedOnboarding) return;
    // Update URL to preserve tab state across refreshes
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newValue.toString());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name.startsWith("leadBuyer.")) {
      const parts = name.split(".");

      // Handle nested contactAddress fields
      if (parts[1] === "contactAddress") {
        const addressField = parts[2];
        setLeadBuyerDetail((prev) =>
          prev
            ? {
                ...prev,
                contactAddress: {
                  ...prev.contactAddress,
                  [addressField]: value,
                },
              }
            : null,
        );
      } else {
        // Handle regular fields
        const field = parts[1];
        setLeadBuyerDetail((prev) =>
          prev ? { ...prev, [field]: value } : null,
        );
      }
    } else {
      if (currentUser) {
        const updates: Partial<
          Pick<
            typeof currentUser,
            | "name"
            | "email"
            | "image"
            | "preferredDistribution"
            | "tierUserType"
          >
        > = {};
        if (name === "name" || name === "email" || name === "image") {
          updates[name] = value;
          dispatch(updateUser(updates));
        }
      }
    }
  };

  const handleSelectChange = (event: SelectChangeEvent<string | string[]>) => {
    const { name, value } = event.target;
    if (name === "leadBuyer.notificationPreferences") {
      setLeadBuyerDetail((prev) =>
        prev ? { ...prev, notificationPreferences: value as string[] } : null,
      );
    } else if (name === "leadBuyer.preferredDistribution") {
      setLeadBuyerDetail((prev) =>
        prev ? { ...prev, preferredDistribution: value as string } : null,
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
          : null,
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
          : null,
      );
    }
  };

  const handlePreferencesMultiSelect = (
    name: keyof Pick<
      BuyerPreferences,
      "industries" | "leadTypes" | "preferredContactMethods"
    >,
    rawValue: string[] | string,
  ) => {
    const normalized = Array.isArray(rawValue)
      ? rawValue
      : (rawValue || "").split(",");
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            [name]: normalized.map((item) => item.trim()).filter(Boolean),
          }
        : prev,
    );
  };

  const handlePreferencesSelect = (
    event: SelectChangeEvent<string | string[]>,
  ) => {
    const { name, value } = event.target;
    if (!preferences) return;

    if (
      name === "industries" ||
      name === "leadTypes" ||
      name === "preferredContactMethods"
    ) {
      handlePreferencesMultiSelect(
        name as keyof Pick<
          BuyerPreferences,
          "industries" | "leadTypes" | "preferredContactMethods"
        >,
        value,
      );
    } else if (
      name === "budgetCapType" ||
      name === "preferenceMatchingThreshold" ||
      name === "timezone" ||
      name === "preferredDistribution"
    ) {
      setPreferences((prev) =>
        prev ? { ...prev, [name]: value as string } : prev,
      );
    }
  };

  const handlePreferencesSwitch =
    (name: keyof BuyerPreferences) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target;
      setPreferences((prev) => {
        if (!prev) return prev;

        // Auto-enable Monday-Friday when business hours is toggled on
        if (name === "acceptOnlyDuringBusinessHours" && checked) {
          const weekdays = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ];
          const updatedSchedule = { ...prev.weeklySchedule };
          weekdays.forEach((day) => {
            updatedSchedule[day] = {
              enabled: true,
              start: prev.workingHours.start,
              end: prev.workingHours.end,
            };
          });
          return {
            ...prev,
            [name]: checked,
            weeklySchedule: updatedSchedule,
          };
        }

        // Auto-enable/disable Saturday-Sunday when weekend acceptance is toggled
        if (name === "notifyOnWeekends") {
          const weekendDays = ["Saturday", "Sunday"];
          const updatedSchedule = { ...prev.weeklySchedule };
          weekendDays.forEach((day) => {
            updatedSchedule[day] = {
              enabled: checked,
              start: checked
                ? prev.workingHours.start
                : updatedSchedule[day]?.start || "09:00",
              end: checked
                ? prev.workingHours.end
                : updatedSchedule[day]?.end || "17:00",
            };
          });
          return {
            ...prev,
            [name]: checked,
            weeklySchedule: updatedSchedule,
          };
        }

        return { ...prev, [name]: checked };
      });
    };

  const handlePreferencesNumber =
    (name: keyof BuyerPreferences) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value) || 0;
      setPreferences((prev) => (prev ? { ...prev, [name]: parsed } : prev));
    };

  const handleWorkingHoursChange = (key: "start" | "end", value: string) => {
    setPreferences((prev) => {
      if (!prev) return prev;

      const updatedWorkingHours = {
        ...prev.workingHours,
        [key]: value,
      };

      // If business hours is enabled, sync Monday-Friday with new working hours
      if (prev.acceptOnlyDuringBusinessHours) {
        const weekdays = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ];
        const updatedSchedule = { ...prev.weeklySchedule };
        weekdays.forEach((day) => {
          if (updatedSchedule[day]?.enabled) {
            updatedSchedule[day] = {
              ...updatedSchedule[day],
              [key]: value,
            };
          }
        });
        return {
          ...prev,
          workingHours: updatedWorkingHours,
          weeklySchedule: updatedSchedule,
        };
      }

      return {
        ...prev,
        workingHours: updatedWorkingHours,
      };
    });
  };

  const handleVacationChange = (
    key: "enabled" | "pauseUntil" | "autoReject",
    value: boolean | string,
  ) => {
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            vacationMode: {
              ...prev.vacationMode,
              [key]: value,
            },
          }
        : prev,
    );
  };

  const handleWeeklyScheduleChange = (
    day: string,
    field: "enabled" | "start" | "end",
    value: boolean | string,
  ) => {
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            weeklySchedule: {
              ...prev.weeklySchedule,
              [day]: {
                ...prev.weeklySchedule[day],
                [field]: value,
              },
            },
          }
        : prev,
    );
  };

  const handleSaveChanges = async (): Promise<boolean> => {
    if (!leadBuyerDetail?._id) {
      notify("Buyer ID not found", "error");
      return false;
    }

    try {
      await axios.put(`/api/buyers?id=${leadBuyerDetail._id}`, leadBuyerDetail);
      await refreshUser(true);
      markOnboardingStepAsCompletedIfNeeded();
      notify("Profile updated successfully!", "success");
      return true;
    } catch (error) {
      console.error("Error updating profile", error);
      notify("Failed to update profile", "error");
      return false;
    }
  };

  const buildPreferredZonesPayload = () => {
    const zones: { city?: string; state?: string; zipCodes?: string[] }[] = [];

    const cityList = preferredCitiesInput
      .split(",")
      .map((city) => city.trim())
      .filter(Boolean);
    cityList.forEach((city) => zones.push({ city }));

    const stateList = preferredStatesInput
      .split(",")
      .map((state) => state.trim())
      .filter(Boolean);
    stateList.forEach((state) => zones.push({ state }));

    const zipList = preferredZipsInput
      .split(",")
      .map((zip) => zip.trim())
      .filter(Boolean);
    if (zipList.length) {
      zones.push({ zipCodes: zipList });
    }

    return zones;
  };

  const handleSavePreferences = async (): Promise<boolean> => {
    if (!preferences) return false;
    try {
      const payload = {
        ...preferences,
        preferredZones: buildPreferredZonesPayload(),
        leadPreferences: {
          industries: preferences.industries,
          industryServicePairs: preferences.industryServicePairs,
        },
      };

      await axios.put("/api/buyers/general-settings", payload);
      await refreshUser(true);
      markOnboardingStepAsCompletedIfNeeded();
      notify("Preferences updated successfully!", "success");
      return true;
    } catch (error) {
      console.error("Error updating preferences", error);
      notify("Failed to update preferences", "error");
      return false;
    }
  };

  const saveCurrentTabRef = useRef<() => Promise<boolean>>(async () => false);
  saveCurrentTabRef.current = async () => {
    if (tabValue === 0) {
      return handleSaveChanges();
    }
    return handleSavePreferences();
  };

  useEffect(() => {
    if (!onSaveHandlerReady) return;
    onSaveHandlerReady(() => saveCurrentTabRef.current());
  }, [onSaveHandlerReady, tabValue]);

  const isLoading =
    userLoading ||
    leadBuyerLoading ||
    !leadBuyerDetail ||
    !currentUser ||
    !preferences;

  const markOnboardingStepAsCompletedIfNeeded = () => {
    if (!fromOnboarding || !currentUser?.email) return;

    const tabToStep: Record<number, BuyerOnboardingStep> = {
      0: "general",
      1: "preferences",
      2: "availability",
      3: "limits",
      4: "location",
    };

    const requestedStep = onboardingStepParam as BuyerOnboardingStep | null;
    const resolvedStep =
      requestedStep && BUYER_ONBOARDING_STEPS.includes(requestedStep)
        ? requestedStep
        : tabToStep[tabValue];

    if (!resolvedStep) return;
    markBuyerOnboardingStepCompleted(currentUser.email, resolvedStep);
    onOnboardingStepSaved?.(resolvedStep);
  };

  return (
    <Container
      maxWidth={embeddedOnboarding ? false : "lg"}
      sx={{
        py: embeddedOnboarding ? 0 : 8,
        px: embeddedOnboarding ? 0 : undefined,
      }}
    >
      {!embeddedOnboarding && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h4" fontWeight={700} color="primary.main">
              Buyer Settings
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage account details, lead preferences, availability, limits, and
            location matching.
          </Typography>
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        {!embeddedOnboarding && (
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
              icon={<PreferencesIcon />}
              iconPosition="start"
              label="Preferences"
            />
            <Tab
              icon={<AvailabilityIcon />}
              iconPosition="start"
              label="Operational Availability"
            />
            <Tab
              icon={<LimitsIcon />}
              iconPosition="start"
              label="Volume & Pricing Limits"
            />
            <Tab
              icon={<LocationIcon />}
              iconPosition="start"
              label="Location Preferences"
            />
          </Tabs>
        )}

        <Box sx={{ p: embeddedOnboarding ? 2 : 4 }}>
          {isLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={220}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
              {tabValue === 0 && (
                <Box>
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
                          src={currentUser?.image}
                          alt="Profile"
                        />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Name"
                            name="name"
                            value={currentUser?.name || ""}
                            disabled
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Email Address"
                            name="email"
                            value={currentUser?.email || ""}
                            disabled
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="Company"
                            name="leadBuyer.company"
                            value={leadBuyerDetail?.company || ""}
                            onChange={handleInputChange}
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="Phone Number"
                            name="leadBuyer.phone"
                            value={leadBuyerDetail?.phone || ""}
                            onChange={handleInputChange}
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Company/Business Description"
                            name="leadBuyer.businessDescription"
                            value={leadBuyerDetail?.businessDescription || ""}
                            onChange={handleInputChange}
                            multiline
                            rows={3}
                            placeholder="Describe your business..."
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="Company Registration Number"
                            name="leadBuyer.companyRegNo"
                            value={leadBuyerDetail?.companyRegNo || ""}
                            onChange={handleInputChange}
                            placeholder="e.g., 12345678"
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="VAT/TAX Registration Number"
                            name="leadBuyer.vatTaxRegNo"
                            value={leadBuyerDetail?.vatTaxRegNo || ""}
                            onChange={handleInputChange}
                            placeholder="e.g., GB123456789"
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Business Website"
                            name="leadBuyer.businessWebsite"
                            value={leadBuyerDetail?.businessWebsite || ""}
                            onChange={handleInputChange}
                            placeholder="https://www.example.com"
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ mb: 1, fontWeight: 600 }}
                          >
                            Contact Address
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Address Line 1"
                            name="leadBuyer.contactAddress.addressLine1"
                            value={
                              leadBuyerDetail?.contactAddress?.addressLine1 ||
                              ""
                            }
                            onChange={handleInputChange}
                            placeholder="Street address"
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Address Line 2"
                            name="leadBuyer.contactAddress.addressLine2"
                            value={
                              leadBuyerDetail?.contactAddress?.addressLine2 ||
                              ""
                            }
                            onChange={handleInputChange}
                            placeholder="Apartment, suite, etc. (optional)"
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="City"
                            name="leadBuyer.contactAddress.city"
                            value={leadBuyerDetail?.contactAddress?.city || ""}
                            onChange={handleInputChange}
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="Post Code"
                            name="leadBuyer.contactAddress.postCode"
                            value={
                              leadBuyerDetail?.contactAddress?.postCode || ""
                            }
                            onChange={handleInputChange}
                            placeholder="e.g., SW1A 1AA"
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <FormControl fullWidth>
                            <InputLabel>Notification Preferences</InputLabel>
                            <Select
                              name="leadBuyer.notificationPreferences"
                              value={
                                leadBuyerDetail?.notificationPreferences || []
                              }
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
                  {!embeddedOnboarding && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: 3,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography component="span">Dark Mode</Typography>
                        <Switch
                          checked={colorMode === "dark"}
                          onChange={toggleColorMode}
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
                  )}
                </Box>
              )}

              {tabValue === 1 && preferences && (
                <Box>
                  {/* INDUSTRIES & SERVICE TAGS */}
                  <Section>
                    <SectionBody>
                      <SectionHeader>🏭 Industries & Services</SectionHeader>
                      <Grid container spacing={2}>
                        {/* Step 1: Select Industry */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Select Industry</InputLabel>
                            <Select
                              value={selectedIndustry}
                              onChange={(e) => {
                                setSelectedIndustry(e.target.value);
                                setSelectedServices([]);
                              }}
                              label="Select Industry"
                            >
                              <MenuItem value="">
                                <em>Choose an industry...</em>
                              </MenuItem>
                              {industryOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Step 2: Select Services (only shown if industry is selected) */}
                        {selectedIndustry && (
                          <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth>
                              <InputLabel>Select Services</InputLabel>
                              <Select
                                multiple
                                value={selectedServices}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setSelectedServices(
                                    typeof value === "string"
                                      ? value.split(",")
                                      : value,
                                  );
                                }}
                                label="Select Services"
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
                                {(
                                  industryServices[
                                    selectedIndustry as keyof typeof industryServices
                                  ] || []
                                ).map((service) => (
                                  <MenuItem key={service} value={service}>
                                    {service}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}

                        {/* Step 3: Add Button */}
                        {selectedIndustry && selectedServices.length > 0 && (
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              onClick={() => {
                                const exists =
                                  preferences.industryServicePairs.findIndex(
                                    (pair) =>
                                      pair.industry === selectedIndustry,
                                  ) !== -1;

                                if (exists) {
                                  setPreferences((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          industryServicePairs:
                                            prev.industryServicePairs.map(
                                              (pair) =>
                                                pair.industry ===
                                                selectedIndustry
                                                  ? {
                                                      ...pair,
                                                      services:
                                                        selectedServices,
                                                    }
                                                  : pair,
                                            ),
                                        }
                                      : prev,
                                  );
                                } else {
                                  setPreferences((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          industryServicePairs: [
                                            ...prev.industryServicePairs,
                                            {
                                              industry: selectedIndustry,
                                              services: selectedServices,
                                            },
                                          ],
                                        }
                                      : prev,
                                  );
                                }

                                setSelectedIndustry("");
                                setSelectedServices([]);
                              }}
                            >
                              + Add Industry & Services
                            </Button>
                          </Grid>
                        )}

                        {/* Display added pairs */}
                        {preferences.industryServicePairs.length > 0 && (
                          <Grid size={{ xs: 12 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{ mb: 2, mt: 2 }}
                            >
                              Added Industries & Services:
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                              }}
                            >
                              {preferences.industryServicePairs.map(
                                (pair, idx) => (
                                  <Paper
                                    key={idx}
                                    sx={{
                                      p: 2,
                                      flex: "0 1 calc(50% - 4px)",
                                      minWidth: 0,
                                      border: "1px solid #ddd",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                      }}
                                    >
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                          variant="subtitle2"
                                          sx={{ fontWeight: 600 }}
                                        >
                                          {pair.industry}
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 0.5,
                                            mt: 1,
                                          }}
                                        >
                                          {pair.services.map((service) => (
                                            <Chip
                                              key={service}
                                              label={service}
                                              size="small"
                                            />
                                          ))}
                                        </Box>
                                      </Box>
                                      <Button
                                        size="small"
                                        color="error"
                                        onClick={() => {
                                          setPreferences((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  industryServicePairs:
                                                    prev.industryServicePairs.filter(
                                                      (_, i) => i !== idx,
                                                    ),
                                                }
                                              : prev,
                                          );
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    </Box>
                                  </Paper>
                                ),
                              )}
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </SectionBody>
                  </Section>

                  {/* DISTRIBUTION PREFERENCES */}
                  <Section>
                    <SectionBody>
                      <SectionHeader>🔄 Distribution Preferences</SectionHeader>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>
                              Preferred Distribution Method
                            </InputLabel>
                            <Select
                              name="preferredDistribution"
                              value={preferences.preferredDistribution}
                              onChange={handlePreferencesSelect}
                              label="Preferred Distribution Method"
                            >
                              <MenuItem value="Automatic">
                                Automatic (Auto Assign)
                              </MenuItem>
                              <MenuItem value="Manual">
                                Manual (Marketplace)
                              </MenuItem>
                              <MenuItem value="Both">Both</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={preferences.autoAcceptMatchingLeads}
                                onChange={(e) =>
                                  setPreferences({
                                    ...preferences,
                                    autoAcceptMatchingLeads: e.target.checked,
                                  })
                                }
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body1">
                                  Auto Accept Leads
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  Automatically accept leads matching your
                                  preferences and charged to your account.
                                </Typography>
                              </Box>
                            }
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={preferences.acceptCallLeads}
                                onChange={(e) =>
                                  setPreferences({
                                    ...preferences,
                                    acceptCallLeads: e.target.checked,
                                  })
                                }
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body1">
                                  Automatically Accept Call Leads?
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  This option must be set to &apos;YES&apos; to
                                  receive phone calls. When set to
                                  &apos;NO&apos;, you will not receive any phone
                                  calls or call notifications.
                                </Typography>
                              </Box>
                            }
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="textSecondary">
                            • <strong>Automatic:</strong> Leads are
                            automatically assigned to you based on your criteria
                            <br />• <strong>Manual:</strong> You browse and
                            purchase leads from the marketplace
                            <br />• <strong>Both:</strong> Receive auto-assigned
                            leads and access marketplace leads
                          </Typography>
                        </Grid>
                      </Grid>
                    </SectionBody>
                  </Section>

                  {/* LEAD QUALITY & TYPES */}
                  <Section>
                    <SectionBody>
                      <SectionHeader>⭐ Lead Quality & Types</SectionHeader>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Lead Types</InputLabel>
                            <Select
                              multiple
                              name="leadTypes"
                              value={preferences.leadTypes}
                              onChange={handlePreferencesSelect}
                              label="Lead Types"
                              renderValue={(selected) =>
                                (selected as string[]).join(", ")
                              }
                            >
                              <MenuItem value="exclusive">Exclusive</MenuItem>
                              <MenuItem value="shared">Shared</MenuItem>
                            </Select>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              sx={{ mt: 0.5 }}
                            >
                              <strong>Exclusive:</strong> Lead sold only to you
                              (higher cost). <strong>Shared:</strong> Lead may
                              be sold to multiple buyers (lower cost).
                            </Typography>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Tooltip title="Set the minimum quality level for leads you'll receive:\n\n• 100: Only High Quality leads (Clean, Legitimate - spam score 0-40)\n• 60: High + Medium Quality (some red flags - spam score 0-69)\n• 30: Accept any quality level\n\nHigher value = Better leads, Lower value = More volume">
                            <TextField
                              fullWidth
                              label="Quality Score Minimum"
                              type="number"
                              inputProps={{ min: 0, max: 100 }}
                              value={preferences.qualificationScoreMinimum}
                              onChange={handlePreferencesNumber(
                                "qualificationScoreMinimum",
                              )}
                              helperText="Rating scale: 100 (Best) → 60 (Good) → 30 (Any)"
                            />
                          </Tooltip>
                        </Grid>
                      </Grid>
                    </SectionBody>
                  </Section>

                  {/* LEAD AGE & CONTACT PREFERENCES */}
                  <Section>
                    <SectionBody>
                      <SectionHeader>
                        ⏱️ Lead Freshness & Contact Preferences
                      </SectionHeader>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Maximum Lead Age (Hours)"
                            type="number"
                            value={preferences.maxLeadAge}
                            onChange={handlePreferencesNumber("maxLeadAge")}
                            inputProps={{ min: 1, max: 168 }}
                            helperText="Only accept leads submitted within this many hours (1-168)"
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <FormControl fullWidth>
                            <InputLabel>Preferred Contact Methods</InputLabel>
                            <Select
                              multiple
                              name="preferredContactMethods"
                              value={preferences.preferredContactMethods || []}
                              onChange={handlePreferencesSelect}
                              label="Preferred Contact Methods"
                              renderValue={(selected) =>
                                (selected as string[]).join(", ")
                              }
                            >
                              <MenuItem value="phone">Phone</MenuItem>
                              <MenuItem value="email">Email</MenuItem>
                              <MenuItem value="sms">SMS</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </SectionBody>
                  </Section>

                  <Divider sx={{ my: 3 }} />

                  {!embeddedOnboarding && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button variant="outlined" color="inherit">
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSavePreferences}
                      >
                        Save Preferences
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 2 && preferences && (
                <Box>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.acceptOnlyDuringBusinessHours}
                            onChange={handlePreferencesSwitch(
                              "acceptOnlyDuringBusinessHours",
                            )}
                          />
                        }
                        label="Accept only during business hours"
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Start Time"
                        type="time"
                        value={preferences.workingHours.start}
                        onChange={(event) =>
                          handleWorkingHoursChange("start", event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="End Time"
                        type="time"
                        value={preferences.workingHours.end}
                        onChange={(event) =>
                          handleWorkingHoursChange("end", event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.vacationMode.enabled}
                            onChange={(event) =>
                              handleVacationChange(
                                "enabled",
                                event.target.checked,
                              )
                            }
                          />
                        }
                        label="Vacation Mode"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Pause Until"
                        InputLabelProps={{ shrink: true }}
                        value={preferences.vacationMode.pauseUntil || ""}
                        onChange={(event) =>
                          handleVacationChange("pauseUntil", event.target.value)
                        }
                        disabled={!preferences.vacationMode.enabled}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.vacationMode.autoReject}
                            onChange={(event) =>
                              handleVacationChange(
                                "autoReject",
                                event.target.checked,
                              )
                            }
                          />
                        }
                        label="Auto-reject while paused"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences.notifyOnWeekends}
                            onChange={handlePreferencesSwitch(
                              "notifyOnWeekends",
                            )}
                          />
                        }
                        label="Accept leads on weekends"
                      />
                    </Grid>
                  </Grid>

                  <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
                    Weekly Schedule - Set Days & Hours for Lead Acceptance
                  </Typography>
                  <Grid container spacing={3}>
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((day) => {
                      const daySchedule = preferences.weeklySchedule?.[day] || {
                        enabled: false,
                        start: "09:00",
                        end: "17:00",
                      };
                      return (
                        <React.Fragment key={day}>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={daySchedule.enabled || false}
                                  onChange={(e) =>
                                    handleWeeklyScheduleChange(
                                      day,
                                      "enabled",
                                      e.target.checked,
                                    )
                                  }
                                />
                              }
                              label={day}
                            />
                          </Grid>
                          <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                              fullWidth
                              label="Start Time"
                              type="time"
                              value={daySchedule.start || "09:00"}
                              onChange={(e) =>
                                handleWeeklyScheduleChange(
                                  day,
                                  "start",
                                  e.target.value,
                                )
                              }
                              disabled={!daySchedule.enabled}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                              fullWidth
                              label="End Time"
                              type="time"
                              value={daySchedule.end || "17:00"}
                              onChange={(e) =>
                                handleWeeklyScheduleChange(
                                  day,
                                  "end",
                                  e.target.value,
                                )
                              }
                              disabled={!daySchedule.enabled}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <Typography variant="body2" sx={{ mt: 2 }}>
                              {daySchedule.enabled ? "Active" : "Disabled"}
                            </Typography>
                          </Grid>
                        </React.Fragment>
                      );
                    })}
                  </Grid>

                  {!embeddedOnboarding && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        mt: 3,
                      }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSavePreferences}
                      >
                        Save Operational Availability
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 3 && preferences && (
                <Box>
                  {/* VOLUME & PRICING LIMITS */}
                  <Section>
                    <SectionBody>
                      <SectionHeader>📊 Volume & Pricing Limits</SectionHeader>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Budget Cap Type</InputLabel>
                            <Select
                              name="budgetCapType"
                              value={preferences.budgetCapType}
                              onChange={handlePreferencesSelect}
                              label="Budget Cap Type"
                            >
                              <MenuItem value="daily">Daily</MenuItem>
                              <MenuItem value="weekly">Weekly</MenuItem>
                              <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              sx={{ mt: 0.5 }}
                            >
                              <strong>Daily:</strong> Budget resets every day.{" "}
                              <strong>Weekly:</strong> Budget resets every week.{" "}
                              <strong>Monthly:</strong> Budget resets every
                              month.
                            </Typography>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Maximum Budget Per Period (Credits/Units)"
                            type="number"
                            value={preferences.budgetLimitAmount}
                            onChange={handlePreferencesNumber(
                              "budgetLimitAmount",
                            )}
                            inputProps={{ min: 0 }}
                            helperText="Total credits/units limit for selected period"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Max Credits Per Lead"
                            type="number"
                            value={preferences.maxPricePerLead}
                            onChange={handlePreferencesNumber(
                              "maxPricePerLead",
                            )}
                            inputProps={{ min: 0 }}
                            helperText="Maximum credits/units you'll spend per lead"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Maximum Leads Per Day"
                            type="number"
                            value={preferences.maxLeadsPerDay}
                            onChange={handlePreferencesNumber("maxLeadsPerDay")}
                            inputProps={{ min: 0 }}
                            helperText="Set to 0 for unlimited"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Volume Limit Per Period"
                            type="number"
                            value={preferences.volumeLimitCount}
                            onChange={handlePreferencesNumber(
                              "volumeLimitCount",
                            )}
                            inputProps={{ min: 0 }}
                            helperText="Total leads per period"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Max Concurrent Leads"
                            type="number"
                            value={preferences.maxConcurrentLeads}
                            onChange={handlePreferencesNumber(
                              "maxConcurrentLeads",
                            )}
                            inputProps={{ min: 0 }}
                            helperText="Maximum active leads at once"
                          />
                        </Grid>
                      </Grid>
                    </SectionBody>
                  </Section>

                  <Divider sx={{ my: 3 }} />

                  {!embeddedOnboarding && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button variant="outlined" color="inherit">
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSavePreferences}
                      >
                        Save Preferences
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 4 && preferences && (
                <Box>
                  {/* LOCATION PREFERENCES */}
                  <Section>
                    <SectionBody>
                      <SectionHeader>📍 Location Preferences</SectionHeader>

                      {/* Timezone */}
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <GoogleTimezoneAutocomplete
                            label="Timezone"
                            value={preferences?.timezone || "America/New_York"}
                            onChange={(timezone) => {
                              setPreferences((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      timezone,
                                    }
                                  : null,
                              );
                            }}
                            placeholder="Search for timezone..."
                            helperText="Search and select your timezone"
                          />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      {/* Preferred Locations */}
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 2, fontWeight: 600, color: "#2e7d32" }}
                      >
                        ✅ Preferred Locations (Include Only These)
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mb: 2, color: "#666" }}
                      >
                        Leave empty to accept leads from all locations. Fill in
                        to restrict to only these locations.
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <GooglePlacesAutocomplete
                            label="Preferred Cities"
                            type="city"
                            value={preferredCitiesInput
                              .split(",")
                              .map((c) => c.trim())
                              .filter(Boolean)}
                            onChange={(values) => {
                              setPreferredCitiesInput(values.join(", "));
                            }}
                            onSelectWithState={(extractedStates) => {
                              // Auto-populate states from selected cities
                              const currentStates = preferredStatesInput
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const mergedStates = [
                                ...new Set([
                                  ...currentStates,
                                  ...extractedStates,
                                ]),
                              ];
                              setPreferredStatesInput(mergedStates.join(", "));
                            }}
                            onSelectWithZipCodes={(extractedZips) => {
                              // Auto-populate zip codes from selected cities
                              const currentZips = preferredZipsInput
                                .split(",")
                                .map((z) => z.trim())
                                .filter(Boolean);
                              const mergedZips = [
                                ...new Set([...currentZips, ...extractedZips]),
                              ];
                              setPreferredZipsInput(mergedZips.join(", "));
                            }}
                            placeholder="Search cities..."
                            helperText="States & zip codes auto-populated from cities"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <GooglePlacesAutocomplete
                            label="Preferred States"
                            type="state"
                            value={preferredStatesInput
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)}
                            onChange={(values) => {
                              setPreferredStatesInput(values.join(", "));
                            }}
                            placeholder="Search states..."
                            helperText="Auto-populated from cities, or add manually"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            fullWidth
                            label="Preferred Zip Codes"
                            placeholder="e.g. 10001, 10002"
                            helperText="Auto-populated from cities, or add manually"
                            value={preferredZipsInput}
                            onChange={(event) =>
                              setPreferredZipsInput(event.target.value)
                            }
                          />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      {/* Matching Options */}
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={preferences.locationMatchingStrict}
                                onChange={handlePreferencesSwitch(
                                  "locationMatchingStrict",
                                )}
                              />
                            }
                            label="Strict Location Matching Only"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Overall Preference Matching</InputLabel>
                            <Select
                              name="preferenceMatchingThreshold"
                              value={preferences.preferenceMatchingThreshold}
                              onChange={handlePreferencesSelect}
                              label="Overall Preference Matching"
                            >
                              <MenuItem value="strict">
                                Strict (70% Match Required)
                              </MenuItem>
                              <MenuItem value="moderate">
                                Moderate (50% Match Required)
                              </MenuItem>
                              <MenuItem value="flexible">
                                Flexible (20% Match Required)
                              </MenuItem>
                            </Select>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              sx={{ mt: 0.5, display: "block" }}
                            >
                              Controls how strictly leads must match all your
                              preferences
                            </Typography>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </SectionBody>
                  </Section>

                  <Divider sx={{ my: 3 }} />

                  {!embeddedOnboarding && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button variant="outlined" color="inherit">
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSavePreferences}
                      >
                        Save Location Preferences
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default AccountSettings;
