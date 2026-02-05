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
  FormControlLabel,
  Paper,
  Divider,
  Autocomplete,
} from "@mui/material";
import { styled } from "@mui/system";
import { usCities } from "@/utils/citiesInUsUk";
import { US_STATES, getStatesFromCities } from "@/utils/usStates";
import { industryNiches } from "@/utils/industryNiches";
import { industryServices } from "@/utils/industryServices";
import { LEAD_SOURCES } from "@/utils/leadSources";
import { timezones } from "@/utils/timezones";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import { useInitializeUser, useAppDispatch, normalizeUser } from "@/lib/hooks";
import { setUser, updateUser } from "@/lib/userSlice";
import { useNotification } from "@/lib/useNotification";
// import cityAreaCodes from "@/utils/cityareacodes";

const Section = styled(Paper)({
  marginBottom: "24px",
  padding: "20px",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  backgroundColor: "#fafafa",
});

const SectionHeader = styled(Typography)({
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "#1976d2",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
});

const preferredDistributionOptions = ["Manual", "Automatic", "Direct"];

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
  restrictedZones?: { city?: string; state?: string; zipCodes?: string[] }[];
  preferredZones?: { city?: string; state?: string; zipCodes?: string[] }[];
  radiusFlexibility?: "strict" | "soft" | "flexible";
  excludedSources?: string[];
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
  serviceRadius?: number;
  preferredContactMethods?: ("phone" | "email" | "sms")[];
  blockDuplicateLeads?: boolean;
  duplicateCheckWindow?: number;
  enableLeadFeedback?: boolean;
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
  restrictedZones: { city?: string; state?: string; zipCodes?: string[] }[];
  preferredZones: { city?: string; state?: string; zipCodes?: string[] }[];
  radiusFlexibility: "strict" | "soft" | "flexible";
  preferenceMatchingThreshold: "strict" | "moderate" | "flexible";
  excludedSources: string[];
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
  serviceRadius: number;
  preferredContactMethods: ("phone" | "email" | "sms")[];
  blockDuplicateLeads: boolean;
  duplicateCheckWindow: number;
  enableLeadFeedback: boolean;
  priorityBySource: { source: string; priority: number }[];
  priorityByIndustry: { industry: string; priority: number }[];
  priorityByLocation: { location: string; priority: number }[];
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
  const [leadBuyerDetail, setLeadBuyerDetail] =
    useState<ILeadBuyerDetail | null>(null);
  const [leadBuyerLoading, setLeadBuyerLoading] = useState(true);
  const [preferences, setPreferences] = useState<BuyerPreferences | null>(null);
  const [restrictedCitiesInput, setRestrictedCitiesInput] = useState("");
  const [restrictedStatesInput, setRestrictedStatesInput] = useState("");
  const [restrictedZipsInput, setRestrictedZipsInput] = useState("");
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
            restrictedZones: buyerDetail.restrictedZones || [],
            preferredZones: buyerDetail.preferredZones || [],
            radiusFlexibility: buyerDetail.radiusFlexibility || "strict",
            preferenceMatchingThreshold:
              buyerDetail.preferenceMatchingThreshold || "moderate",
            excludedSources: buyerDetail.excludedSources || [],
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
            serviceRadius: buyerDetail.serviceRadius ?? 25,
            preferredContactMethods: buyerDetail.preferredContactMethods || [
              "phone",
              "email",
            ],
            blockDuplicateLeads: buyerDetail.blockDuplicateLeads ?? true,
            duplicateCheckWindow: buyerDetail.duplicateCheckWindow ?? 30,
            enableLeadFeedback: buyerDetail.enableLeadFeedback ?? true,
            priorityBySource: buyerDetail.priorityBySource || [],
            priorityByIndustry: buyerDetail.priorityByIndustry || [],
            priorityByLocation: buyerDetail.priorityByLocation || [],
          });

          const cityZones = (buyerDetail.restrictedZones || [])
            .filter((zone: any) => zone.city)
            .map((zone: any) => zone.city)
            .filter(Boolean);
          const stateZones = (buyerDetail.restrictedZones || [])
            .filter((zone: any) => zone.state)
            .map((zone: any) => zone.state)
            .filter(Boolean);
          const zipZones = (buyerDetail.restrictedZones || [])
            .flatMap((zone: any) => zone.zipCodes || [])
            .filter(Boolean);
          setRestrictedCitiesInput(cityZones.join(", "));
          setRestrictedStatesInput(stateZones.join(", "));
          setRestrictedZipsInput(zipZones.join(", "));

          // Parse preferred zones
          const preferredCityZones = (buyerDetail.preferredZones || [])
            .filter((zone: any) => zone.city)
            .map((zone: any) => zone.city)
            .filter(Boolean);
          const preferredStateZones = (buyerDetail.preferredZones || [])
            .filter((zone: any) => zone.state)
            .map((zone: any) => zone.state)
            .filter(Boolean);
          const preferredZipZones = (buyerDetail.preferredZones || [])
            .flatMap((zone: any) => zone.zipCodes || [])
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDarkModeToggle = () => {
    setDarkMode((prev) => !prev);
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
        dispatch(updateUser({ [name]: value } as any));
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
      "industries" | "excludedSources" | "leadTypes" | "preferredContactMethods"
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
      name === "excludedSources" ||
      name === "leadTypes" ||
      name === "preferredContactMethods"
    ) {
      handlePreferencesMultiSelect(name as any, value);
    } else if (
      name === "budgetCapType" ||
      name === "radiusFlexibility" ||
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

  const handleCommaListChange =
    (name: keyof BuyerPreferences) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      setPreferences((prev) => (prev ? { ...prev, [name]: list } : prev));
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

  const handleWebhookChange =
    (key: "enabled" | "url" | "authToken") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        key === "enabled" ? event.target.checked : event.target.value;
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              webhookConfig: {
                ...prev.webhookConfig,
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

  const handleServiceLocationChange = (
    index: number,
    field: "city" | "state" | "country" | "radius" | "zipCodes",
    value: string | number | string[],
  ) => {
    setPreferences((prev) => {
      if (!prev) return prev;
      const updated = [...prev.serviceLocations];
      if (field === "zipCodes") {
        updated[index] = { ...updated[index], zipCodes: value as string[] };
      } else if (field === "radius") {
        updated[index] = { ...updated[index], radius: value as number };
      } else {
        updated[index] = { ...updated[index], [field]: value as string };
      }
      return { ...prev, serviceLocations: updated };
    });
  };

  const handleAddServiceLocation = () => {
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            serviceLocations: [
              ...prev.serviceLocations,
              { city: "", state: "", country: "USA", zipCodes: [], radius: 25 },
            ],
          }
        : prev,
    );
  };

  const handleRemoveServiceLocation = (index: number) => {
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            serviceLocations: prev.serviceLocations.filter(
              (_, i) => i !== index,
            ),
          }
        : prev,
    );
  };

  const handleSaveChanges = async () => {
    if (!leadBuyerDetail?._id) {
      notify("Buyer ID not found", "error");
      return;
    }

    try {
      await axios.put(`/api/buyers?id=${leadBuyerDetail._id}`, leadBuyerDetail);
      await refreshUser(true);
      notify("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Error updating profile", error);
      notify("Failed to update profile", "error");
    }
  };

  const buildRestrictedZonesPayload = () => {
    const zones: { city?: string; state?: string; zipCodes?: string[] }[] = [];

    const cityList = restrictedCitiesInput
      .split(",")
      .map((city) => city.trim())
      .filter(Boolean);
    cityList.forEach((city) => zones.push({ city }));

    const stateList = restrictedStatesInput
      .split(",")
      .map((state) => state.trim())
      .filter(Boolean);
    stateList.forEach((state) => zones.push({ state }));

    const zipList = restrictedZipsInput
      .split(",")
      .map((zip) => zip.trim())
      .filter(Boolean);
    if (zipList.length) {
      zones.push({ zipCodes: zipList });
    }

    return zones;
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

  const handleSavePreferences = async () => {
    if (!preferences) return;
    try {
      const payload = {
        ...preferences,
        restrictedZones: buildRestrictedZonesPayload(),
        preferredZones: buildPreferredZonesPayload(),
        leadPreferences: {
          industries: preferences.industries,
          industryServicePairs: preferences.industryServicePairs,
        },
      };

      await axios.put("/api/buyers/general-settings", payload);
      await refreshUser(true);
      notify("Preferences updated successfully!", "success");
    } catch (error) {
      console.error("Error updating preferences", error);
      notify("Failed to update preferences", "error");
    }
  };

  const isLoading =
    userLoading ||
    leadBuyerLoading ||
    !leadBuyerDetail ||
    !currentUser ||
    !preferences;

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
        <Tab label="Preferences" />
        <Tab label="Operational Availability" />
        <Tab label="Volume & Pricing Limits" />
        <Tab label="Location Preferences" />
      </Tabs>
      {isLoading ? (
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
                          leadBuyerDetail?.contactAddress?.addressLine1 || ""
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
                          leadBuyerDetail?.contactAddress?.addressLine2 || ""
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
                        value={leadBuyerDetail?.contactAddress?.postCode || ""}
                        onChange={handleInputChange}
                        placeholder="e.g., SW1A 1AA"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
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
                {/* <Box>
                  <Typography component="span">Dark Mode</Typography>
                  <Switch
                    checked={darkMode}
                    onChange={handleDarkModeToggle}
                    color="primary"
                  />
                </Box> */}
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

          {tabValue === 1 && preferences && (
            <Box sx={{ mt: 3 }}>
              {/* INDUSTRIES & SERVICE TAGS */}
              <Section>
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
                              (pair) => pair.industry === selectedIndustry,
                            ) !== -1;

                          if (exists) {
                            setPreferences((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    industryServicePairs:
                                      prev.industryServicePairs.map((pair) =>
                                        pair.industry === selectedIndustry
                                          ? {
                                              ...pair,
                                              services: selectedServices,
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
                      <Typography variant="subtitle2" sx={{ mb: 2, mt: 2 }}>
                        Added Industries & Services:
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                        }}
                      >
                        {preferences.industryServicePairs.map((pair, idx) => (
                          <Paper
                            key={idx}
                            sx={{
                              p: 2,
                              flex: "0 1 calc(50% - 4px)",
                              border: "1px solid #ddd",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {pair.industry}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
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
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Section>

              {/* DISTRIBUTION PREFERENCES */}
              <Section>
                <SectionHeader>🔄 Distribution Preferences</SectionHeader>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Preferred Distribution Method</InputLabel>
                      <Select
                        name="preferredDistribution"
                        value={preferences.preferredDistribution}
                        onChange={handlePreferencesSelect}
                        label="Preferred Distribution Method"
                      >
                        <MenuItem value="Automatic">
                          Automatic (Auto Assign)
                        </MenuItem>
                        <MenuItem value="Manual">Manual (Marketplace)</MenuItem>
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
                          <Typography variant="caption" color="textSecondary">
                            Automatically accept leads matching your preferences
                            and charged to your account.
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
                          <Typography variant="caption" color="textSecondary">
                            This option must be set to 'YES' to receive phone
                            calls. When set to 'NO', you will not receive any
                            phone calls or call notifications.
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="textSecondary">
                      • <strong>Automatic:</strong> Leads are automatically
                      assigned to you based on your criteria
                      <br />• <strong>Manual:</strong> You browse and purchase
                      leads from the marketplace
                      <br />• <strong>Both:</strong> Receive auto-assigned leads
                      and access marketplace leads
                    </Typography>
                  </Grid>
                </Grid>
              </Section>

              {/* LEAD QUALITY & TYPES */}
              <Section>
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
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Quality Score Minimum"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={preferences.qualificationScoreMinimum}
                      onChange={handlePreferencesNumber(
                        "qualificationScoreMinimum",
                      )}
                      helperText="0-100 scale (0 = any quality)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Excluded Lead Sources</InputLabel>
                      <Select
                        multiple
                        name="excludedSources"
                        value={preferences.excludedSources}
                        onChange={handlePreferencesSelect}
                        label="Excluded Lead Sources"
                        renderValue={(selected) => (
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                          >
                            {(selected as string[]).map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {LEAD_SOURCES.map((source) => (
                          <MenuItem key={source.value} value={source.value}>
                            {source.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Section>

              {/* LEAD AGE & CONTACT PREFERENCES */}
              <Section>
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
              </Section>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
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
            </Box>
          )}

          {tabValue === 2 && preferences && (
            <Box sx={{ mt: 3 }}>
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
                          handleVacationChange("enabled", event.target.checked)
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
                        onChange={handlePreferencesSwitch("notifyOnWeekends")}
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
            </Box>
          )}

          {tabValue === 3 && preferences && (
            <Box sx={{ mt: 3 }}>
              {/* VOLUME & PRICING LIMITS */}
              <Section>
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
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Maximum Budget Per Period (Credits/Units)"
                      type="number"
                      value={preferences.budgetLimitAmount}
                      onChange={handlePreferencesNumber("budgetLimitAmount")}
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
                      onChange={handlePreferencesNumber("maxPricePerLead")}
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
                      onChange={handlePreferencesNumber("volumeLimitCount")}
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
                      onChange={handlePreferencesNumber("maxConcurrentLeads")}
                      inputProps={{ min: 0 }}
                      helperText="Maximum active leads at once"
                    />
                  </Grid>
                </Grid>
              </Section>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
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
            </Box>
          )}

          {tabValue === 4 && preferences && (
            <Box sx={{ mt: 3 }}>
              {/* LOCATION PREFERENCES */}
              <Section>
                <SectionHeader>📍 Location Preferences</SectionHeader>

                {/* Timezone */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        name="timezone"
                        value={preferences?.timezone || "America/New_York"}
                        onChange={handlePreferencesSelect}
                        label="Timezone"
                      >
                        {timezones
                          .filter((tz: any) => tz.value)
                          .map((tz: any) => (
                            <MenuItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Restricted Locations */}
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, fontWeight: 600, color: "#d32f2f" }}
                >
                  ❌ Restricted Locations (Exclude These)
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={usCities}
                      value={restrictedCitiesInput
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean)}
                      onChange={(event, newValue) => {
                        setRestrictedCitiesInput(newValue.join(", "));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Restricted Cities"
                          placeholder="Select or type cities to exclude"
                          helperText="Cities to exclude from leads"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key: _, ...tagProps } = getTagProps({
                            index,
                          });
                          return (
                            <Chip key={index} label={option} {...tagProps} />
                          );
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Autocomplete
                      multiple
                      options={getStatesFromCities(usCities).map((state) => {
                        const stateObj = US_STATES.find(
                          (s) => s.value === state,
                        );
                        return {
                          value: state,
                          label: stateObj?.label || state,
                        };
                      })}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.label
                      }
                      value={restrictedStatesInput
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((state) => ({
                          value: state,
                          label:
                            US_STATES.find((s) => s.value === state)?.label ||
                            state,
                        }))}
                      onChange={(event, newValue) => {
                        setRestrictedStatesInput(
                          newValue.map((v) => v.value).join(", "),
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Restricted States"
                          placeholder="Select states to exclude"
                          helperText="States to exclude from leads"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key: _, ...tagProps } = getTagProps({
                            index,
                          });
                          return (
                            <Chip
                              key={index}
                              label={option.label}
                              {...tagProps}
                            />
                          );
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Restricted Zip Codes"
                      placeholder="e.g. 90001, 90002"
                      helperText="Zipcodes to exclude (comma separated)"
                      value={restrictedZipsInput}
                      onChange={(event) =>
                        setRestrictedZipsInput(event.target.value)
                      }
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
                  Leave empty to accept leads from all locations. Fill in to
                  restrict to only these locations.
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={usCities}
                      value={preferredCitiesInput
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean)}
                      onChange={(event, newValue) => {
                        setPreferredCitiesInput(newValue.join(", "));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Preferred Cities"
                          placeholder="Select cities you want"
                          helperText="Cities to include only"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key: _, ...tagProps } = getTagProps({
                            index,
                          });
                          return (
                            <Chip key={index} label={option} {...tagProps} />
                          );
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Autocomplete
                      multiple
                      options={getStatesFromCities(usCities).map((state) => {
                        const stateObj = US_STATES.find(
                          (s) => s.value === state,
                        );
                        return {
                          value: state,
                          label: stateObj?.label || state,
                        };
                      })}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option.label
                      }
                      value={preferredStatesInput
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((state) => ({
                          value: state,
                          label:
                            US_STATES.find((s) => s.value === state)?.label ||
                            state,
                        }))}
                      onChange={(event, newValue) => {
                        setPreferredStatesInput(
                          newValue.map((v) => v.value).join(", "),
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Preferred States"
                          placeholder="Select states you want"
                          helperText="States to include only"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key: _, ...tagProps } = getTagProps({
                            index,
                          });
                          return (
                            <Chip
                              key={index}
                              label={option.label}
                              {...tagProps}
                            />
                          );
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Preferred Zip Codes"
                      placeholder="e.g. 10001, 10002"
                      helperText="Zipcodes to include only (comma separated)"
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
                      <InputLabel>Radius Flexibility</InputLabel>
                      <Select
                        name="radiusFlexibility"
                        value={preferences.radiusFlexibility}
                        onChange={handlePreferencesSelect}
                        label="Radius Flexibility"
                      >
                        <MenuItem value="strict">Strict (Exact Match)</MenuItem>
                        <MenuItem value="soft">Soft (±10% Flexible)</MenuItem>
                        <MenuItem value="flexible">
                          Flexible (Any Radius)
                        </MenuItem>
                      </Select>
                    </FormControl>
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Service Radius (Miles)"
                      type="number"
                      value={preferences.serviceRadius}
                      onChange={handlePreferencesNumber("serviceRadius")}
                      inputProps={{ min: 1, max: 500 }}
                      helperText="Geographic coverage radius in miles"
                    />
                  </Grid>
                </Grid>
              </Section>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
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
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AccountSettings;
