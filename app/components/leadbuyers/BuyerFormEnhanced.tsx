"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Button,
  Box,
  InputLabel,
  FormControl,
  FormHelperText,
  SelectChangeEvent,
  Snackbar,
  Alert,
  Tooltip,
  Grid,
  Typography,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Switch,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { IBuyer } from "@/models/leadbuyers";
import { industryNiches } from "@/utils/industryNiches";
import GooglePlacesAutocomplete from "../GooglePlacesAutocomplete";
import GoogleTimezoneAutocomplete from "../GoogleTimezoneAutocomplete";
import { validateBuyerCoreFields } from "./buyerFormValidation";
import { useDashboardTerms } from "@/app/hooks";

interface BuyerFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (buyerData: Partial<IBuyer> & { sellerId: string }) => Promise<void>;
  initialValues?: Partial<IBuyer>;
  sellerId: string;
}

// Extracted so it can be reused both as the initial state and as the
// reset target when the form switches from editing a buyer back to "Add
// New" — previously there was no reset path for that transition at all.
function getDefaultFormData(): Partial<IBuyer> {
  return {
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "new",
    leadPreferences: {
      location: [],
      industries: [],
      industryServicePairs: [],
    },
    preferredDistribution: "Automatic",
    notificationPreferences: ["Email"],
    workingHours: {
      start: "09:00",
      end: "17:00",
    },
    timezone: "America/New_York",
    maxLeadsPerDay: 5,
    qualificationScoreMinimum: 0,
    maxPricePerLead: 0,
    leadTypes: ["shared"],
    priority: 5,
    acceptOnlyDuringBusinessHours: false,
    notifyOnWeekends: true,
    vacationMode: {
      enabled: false,
      autoReject: true,
    },
    budgetCapType: "daily",
    budgetLimitAmount: 0,
    volumeLimitCount: 0,
    maxConcurrentLeads: 10,
    autoAcceptMatchingLeads: false,
    locationMatchingStrict: false,
    preferenceMatchingThreshold: "moderate",
    preferredZones: [],
    serviceLocations: [],
    weeklySchedule: {
      Monday: { enabled: true, start: "09:00", end: "17:00" },
      Tuesday: { enabled: true, start: "09:00", end: "17:00" },
      Wednesday: { enabled: true, start: "09:00", end: "17:00" },
      Thursday: { enabled: true, start: "09:00", end: "17:00" },
      Friday: { enabled: true, start: "09:00", end: "17:00" },
      Saturday: { enabled: false, start: "09:00", end: "17:00" },
      Sunday: { enabled: false, start: "09:00", end: "17:00" },
    },
    maxLeadAge: 24,
    preferredContactMethods: ["phone", "email"],
    priorityBySource: [],
    priorityByIndustry: [],
    priorityByLocation: [],
  };
}

const BuyerFormEnhanced: React.FC<BuyerFormProps> = ({
  open,
  onClose,
  onSave,
  initialValues,
  sellerId,
}) => {
  const terms = useDashboardTerms();
  const [formData, setFormData] = useState<Partial<IBuyer>>(
    getDefaultFormData(),
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  useEffect(() => {
    if (initialValues) {
      setFormData({
        ...initialValues,
        leadPreferences: {
          location: Array.isArray(initialValues.leadPreferences?.location)
            ? initialValues.leadPreferences.location
            : initialValues.leadPreferences?.location
              ? [initialValues.leadPreferences.location]
              : [],
          industries: initialValues.leadPreferences?.industries || [],
          industryServicePairs:
            initialValues.leadPreferences?.industryServicePairs || [],
        },
        preferredDistribution:
          initialValues.preferredDistribution || "Automatic",
        notificationPreferences: initialValues.notificationPreferences || [
          "Email",
        ],
        workingHours: initialValues.workingHours || {
          start: "09:00",
          end: "17:00",
        },
        timezone: initialValues.timezone || "America/New_York",
        // These five use ?? rather than || — a legitimate stored value of 0
        // (e.g. a paused buyer with maxLeadsPerDay: 0) was previously being
        // silently overwritten with the non-zero default every time the
        // edit form reopened.
        maxLeadsPerDay: initialValues.maxLeadsPerDay ?? 5,
        qualificationScoreMinimum: initialValues.qualificationScoreMinimum ?? 0,
        maxPricePerLead: initialValues.maxPricePerLead ?? 0,
        leadTypes: initialValues.leadTypes || ["shared"],
        priority: initialValues.priority ?? 5,
        acceptOnlyDuringBusinessHours:
          initialValues.acceptOnlyDuringBusinessHours || false,
        notifyOnWeekends:
          initialValues.notifyOnWeekends !== undefined
            ? initialValues.notifyOnWeekends
            : true,
        vacationMode: initialValues.vacationMode || {
          enabled: false,
          autoReject: true,
        },
        budgetCapType: initialValues.budgetCapType || "daily",
        budgetLimitAmount: initialValues.budgetLimitAmount ?? 0,
        volumeLimitCount: initialValues.volumeLimitCount ?? 0,
        maxConcurrentLeads: initialValues.maxConcurrentLeads ?? 10,
        autoAcceptMatchingLeads: initialValues.autoAcceptMatchingLeads || false,
        locationMatchingStrict: initialValues.locationMatchingStrict || false,
        preferenceMatchingThreshold:
          initialValues.preferenceMatchingThreshold || "moderate",
        preferredZones: initialValues.preferredZones || [],
        serviceLocations: initialValues.serviceLocations || [],
        weeklySchedule: initialValues.weeklySchedule || {
          Monday: { enabled: true, start: "09:00", end: "17:00" },
          Tuesday: { enabled: true, start: "09:00", end: "17:00" },
          Wednesday: { enabled: true, start: "09:00", end: "17:00" },
          Thursday: { enabled: true, start: "09:00", end: "17:00" },
          Friday: { enabled: true, start: "09:00", end: "17:00" },
          Saturday: { enabled: false, start: "09:00", end: "17:00" },
          Sunday: { enabled: false, start: "09:00", end: "17:00" },
        },
        maxLeadAge: initialValues.maxLeadAge ?? 24,
        preferredContactMethods: initialValues.preferredContactMethods || [
          "phone",
          "email",
        ],
        priorityBySource: initialValues.priorityBySource || [],
        priorityByIndustry: initialValues.priorityByIndustry || [],
        priorityByLocation: initialValues.priorityByLocation || [],
      });
    } else {
      // Switching from "Edit Buyer" to "Add New" (or the dialog opening
      // fresh) — previously there was no reset here at all, so the form
      // could show the last-edited buyer's data under an "Add New" title.
      setFormData(getDefaultFormData());
    }
    setErrors({});
  }, [initialValues]);

  const validate = () => {
    const newErrors = validateBuyerCoreFields(formData);

    // Numeric fields previously only had cosmetic min/max on the input —
    // native constraint validation never actually ran because submission
    // is handled entirely by this function, so out-of-range values (or a
    // priority of 999) reached the network layer unchecked.
    if (
      formData.priority !== undefined &&
      (formData.priority < 1 || formData.priority > 10)
    ) {
      newErrors.priority = "Priority must be between 1 and 10";
    }
    if (
      formData.qualificationScoreMinimum !== undefined &&
      (formData.qualificationScoreMinimum < 0 ||
        formData.qualificationScoreMinimum > 100)
    ) {
      newErrors.qualificationScoreMinimum = "Must be between 0 and 100";
    }
    if (
      formData.maxLeadAge !== undefined &&
      (formData.maxLeadAge < 1 || formData.maxLeadAge > 168)
    ) {
      newErrors.maxLeadAge = "Must be between 1 and 168 hours";
    }
    if (
      formData.maxConcurrentLeads !== undefined &&
      formData.maxConcurrentLeads < 0
    ) {
      newErrors.maxConcurrentLeads = "Cannot be negative";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseInt(value, 10) || 0,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string | number>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLeadPreferencesChange = (
    e: SelectChangeEvent<string | string[]>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      leadPreferences: {
        ...prev.leadPreferences!,
        [name]: value,
      },
    }));
  };

  const handleLeadTypesChange = (e: SelectChangeEvent<string[]>) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      leadTypes: value as ("exclusive" | "shared")[],
    }));
  };

  const handleNotificationPreferencesChange = (
    e: SelectChangeEvent<string[]>,
  ) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      notificationPreferences: value as (
        | "Email"
        | "SMS"
        | "In-App Notification"
      )[],
    }));
  };

  const handlePreferredContactMethodsChange = (
    e: SelectChangeEvent<string[]>,
  ) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      preferredContactMethods: value as ("phone" | "email" | "sms")[],
    }));
  };

  const handleWorkingHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours!,
        [name]: value,
      },
    }));
  };

  const handleVacationModeChange = (
    field: keyof IBuyer["vacationMode"],
    // pauseUntil comes in as a raw datetime-local input string; Mongoose
    // casts it to Date on save.
    value: boolean | Date | string | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      vacationMode: {
        ...prev.vacationMode!,
        [field]: value,
      },
    }));
  };

  const handleWeeklyScheduleChange = (
    day: string,
    field: "enabled" | "start" | "end",
    value: boolean | string,
  ) => {
    setFormData((prev) => {
      const currentSchedule = prev.weeklySchedule?.[day] || {
        enabled: true,
        start: "09:00",
        end: "17:00",
      };
      return {
        ...prev,
        weeklySchedule: {
          ...prev.weeklySchedule,
          [day]: {
            ...currentSchedule,
            [field]: value,
          },
        },
      };
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // preferredZones is schema'd as one entry PER CITY (each with its own
  // city/state/zipCodes), but this used to always write a single entry
  // whose city field was every selected city joined into one string (e.g.
  // "New York, Los Angeles"). Since the schema types city as a plain
  // string, any matching logic doing an equality/contains check against a
  // real lead's city would never match that literal joined string — a
  // buyer selecting more than one city stopped matching any lead at all.
  //
  // GooglePlacesAutocomplete's auto-populate callbacks return one merged
  // zip/state set across every currently-selected city (not attributed
  // per-city), so full per-city zip isolation isn't achievable without
  // changing that shared component's contract (it's also used by
  // BuyerForm.tsx and the buyer settings page). This at least keeps one
  // real zone entry per selected city, fixing the exact-match case.
  const handleCitiesChange = (cities: string[]) => {
    setFormData((prev) => {
      const sharedState = prev.preferredZones?.[0]?.state || "";
      const sharedZipCodes = prev.preferredZones?.[0]?.zipCodes || [];
      return {
        ...prev,
        preferredZones: cities.map((city) => ({
          city,
          state: sharedState,
          zipCodes: sharedZipCodes,
        })),
      };
    });
  };

  const handleZonesStateChange = (states: string[]) => {
    const stateValue = states.join(", ");
    setFormData((prev) => ({
      ...prev,
      preferredZones: (prev.preferredZones || []).map((zone) => ({
        ...zone,
        state: stateValue,
      })),
    }));
  };

  const handleZonesZipCodesChange = (zipCodes: string[]) => {
    setFormData((prev) => ({
      ...prev,
      preferredZones: (prev.preferredZones || []).map((zone) => ({
        ...zone,
        zipCodes,
      })),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      // Previously a validation failure did nothing visible at all if the
      // only invalid field lived inside a collapsed accordion (e.g.
      // Timezone, inside "Location Preferences") — clicking Save just
      // appeared to do nothing. This at least surfaces what's wrong.
      setSnackbar({
        open: true,
        message: `Please fix: ${Object.values(validationErrors).join("; ")}`,
        severity: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({ ...formData, sellerId });
      setSnackbar({
        open: true,
        message: `${terms.buyer} saved successfully!`,
        severity: "success",
      });
      onClose();
    } catch (error) {
      console.error(`Failed to save ${terms.buyerLower}:`, error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : `Failed to save ${terms.buyerLower}. Please try again.`,
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>
          {initialValues
            ? `Edit ${terms.buyer}`
            : `Register ${terms.buyer}`}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "80vh", overflow: "auto" }}>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
          >
            {/* BASIC INFORMATION */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Basic Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      fullWidth
                      required
                      error={!!errors.name}
                      helperText={errors.name}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      fullWidth
                      required
                      error={!!errors.company}
                      helperText={errors.company}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      fullWidth
                      required
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      fullWidth
                      required
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        name="status"
                        value={formData.status}
                        onChange={handleSelectChange}
                        label="Status"
                      >
                        <MenuItem value="new">New</MenuItem>
                        <MenuItem
                          value="active"
                          disabled={initialValues?.status !== "active"}
                        >
                          Active
                        </MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="suspended">Suspended</MenuItem>
                      </Select>
                      {initialValues?.status !== "active" && (
                        <FormHelperText>
                          Activates automatically after the{" "}
                          {terms.buyerLower}&apos;s first purchase — it
                          can&apos;t be set manually.
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Priority (1-10)"
                      name="priority"
                      type="number"
                      value={formData.priority}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* LOCATION PREFERENCES */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Location Preferences</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Timezone */}
                  <Grid size={{ xs: 12 }}>
                    <GoogleTimezoneAutocomplete
                      label="Timezone"
                      value={formData.timezone || ""}
                      onChange={(timezone) =>
                        setFormData((prev) => ({ ...prev, timezone }))
                      }
                      placeholder="Search for timezone..."
                      helperText={
                        errors.timezone || "Search and select your timezone"
                      }
                      error={!!errors.timezone}
                      errorText={errors.timezone}
                      required
                    />
                  </Grid>

                  {/* PREFERRED LOCATIONS (INCLUDE ONLY) */}
                  <Grid size={{ xs: 12 }}>
                    <Typography
                      variant="subtitle1"
                      color="success.main"
                      gutterBottom
                      sx={{ mt: 2 }}
                    >
                      ✅ Preferred Locations (Include Only These)
                    </Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      Leave empty to accept leads from all locations. Fill in to
                      restrict to only these locations.
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <GooglePlacesAutocomplete
                      label="Preferred Cities"
                      type="city"
                      value={
                        formData.preferredZones
                          ?.map((zone) => zone.city)
                          .filter((city): city is string => Boolean(city)) ||
                        []
                      }
                      onChange={handleCitiesChange}
                      onSelectWithState={(extractedStates) => {
                        // Auto-populate states from selected cities
                        const currentStates =
                          formData.preferredZones?.[0]?.state
                            ?.split(", ")
                            .filter(Boolean) || [];
                        const mergedStates = [
                          ...new Set([...currentStates, ...extractedStates]),
                        ];
                        handleZonesStateChange(mergedStates);
                      }}
                      onSelectWithZipCodes={(extractedZips) => {
                        // Auto-populate zip codes from selected cities
                        const currentZips =
                          formData.preferredZones?.[0]?.zipCodes || [];
                        const mergedZips = [
                          ...new Set([...currentZips, ...extractedZips]),
                        ];
                        handleZonesZipCodesChange(mergedZips);
                      }}
                      placeholder="Search cities..."
                      helperText="States & zip codes auto-populated from cities"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <GooglePlacesAutocomplete
                      label="Preferred States"
                      type="state"
                      value={
                        formData.preferredZones?.[0]?.state
                          ?.split(", ")
                          .filter(Boolean) || []
                      }
                      onChange={handleZonesStateChange}
                      placeholder="Search states..."
                      helperText="Auto-populated from cities, or add manually"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Preferred Zip Codes"
                      name="preferredZipCodes"
                      value={
                        formData.preferredZones?.[0]?.zipCodes?.join(", ") || ""
                      }
                      onChange={(e) =>
                        handleZonesZipCodesChange(
                          e.target.value
                            .split(",")
                            .map((z) => z.trim())
                            .filter(Boolean),
                        )
                      }
                      fullWidth
                      placeholder="e.g. 88901, 89104"
                      helperText="Applies to every selected city — auto-populated from cities, or add manually (comma separated)"
                    />
                  </Grid>

                  {/* STRICT LOCATION MATCHING */}
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="locationMatchingStrict"
                          checked={formData.locationMatchingStrict || false}
                          onChange={handleCheckboxChange}
                        />
                      }
                      label="Strict Location Matching Only"
                    />
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      display="block"
                      sx={{ ml: 4 }}
                    >
                      Only accept leads that exactly match preferred locations
                    </Typography>
                  </Grid>

                  {/* OVERALL PREFERENCE MATCHING */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Overall Preference Matching</InputLabel>
                      <Select
                        name="preferenceMatchingThreshold"
                        value={formData.preferenceMatchingThreshold}
                        onChange={handleSelectChange}
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
              </AccordionDetails>
            </Accordion>

            {/* LEAD PREFERENCES */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Lead Preferences</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Lead Types</InputLabel>
                      <Select
                        name="leadTypes"
                        value={formData.leadTypes || []}
                        onChange={handleLeadTypesChange}
                        label="Lead Types"
                        multiple
                      >
                        <MenuItem value="exclusive">Exclusive</MenuItem>
                        <MenuItem value="shared">Shared</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Preferred Industries</InputLabel>
                      <Select
                        name="industries"
                        value={formData.leadPreferences?.industries || []}
                        onChange={handleLeadPreferencesChange}
                        label="Preferred Industries"
                        multiple
                      >
                        {industryNiches.map((niche) => (
                          <MenuItem key={niche.value} value={niche.value}>
                            {niche.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Tooltip title="Set the minimum quality level for leads you'll receive:\n\n• 100: Only High Quality leads (Clean, Legitimate - spam score 0-40)\n• 60: High + Medium Quality (some red flags - spam score 0-69)\n• 30: Accept any quality level\n\nHigher = Better leads, Lower = More volume">
                      <TextField
                        label="Minimum Qualification Score"
                        name="qualificationScoreMinimum"
                        type="number"
                        value={formData.qualificationScoreMinimum}
                        onChange={handleNumberChange}
                        fullWidth
                        inputProps={{ min: 0 }}
                        helperText="Rating scale: 100 (Best) → 60 (Good) → 30 (Any)"
                      />
                    </Tooltip>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max Credits Per Lead"
                      name="maxPricePerLead"
                      type="number"
                      value={formData.maxPricePerLead}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 0 }}
                      helperText="Maximum credits/units you'll spend per lead"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max Leads Per Day"
                      name="maxLeadsPerDay"
                      type="number"
                      value={formData.maxLeadsPerDay}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  </Grid>

                  {/* Lead Freshness & Contact */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Lead Freshness & Contact Preferences
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Maximum Lead Age (Hours)"
                      name="maxLeadAge"
                      type="number"
                      value={formData.maxLeadAge}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 1, max: 168 }}
                      helperText="Only accept leads within this many hours"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Preferred Contact Methods</InputLabel>
                      <Select
                        name="preferredContactMethods"
                        value={formData.preferredContactMethods || []}
                        onChange={handlePreferredContactMethodsChange}
                        label="Preferred Contact Methods"
                        multiple
                      >
                        <MenuItem value="phone">Phone</MenuItem>
                        <MenuItem value="email">Email</MenuItem>
                        <MenuItem value="sms">SMS</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* OPERATIONAL AVAILABILITY */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Operational Availability</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Default Working Hours
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Start Time"
                          name="start"
                          type="time"
                          value={formData.workingHours?.start}
                          onChange={handleWorkingHoursChange}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="End Time"
                          name="end"
                          type="time"
                          value={formData.workingHours?.end}
                          onChange={handleWorkingHoursChange}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="acceptOnlyDuringBusinessHours"
                          checked={
                            formData.acceptOnlyDuringBusinessHours || false
                          }
                          onChange={handleCheckboxChange}
                        />
                      }
                      label="Only accept leads during business hours"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="notifyOnWeekends"
                          checked={formData.notifyOnWeekends !== false}
                          onChange={handleCheckboxChange}
                        />
                      }
                      label="Notify on weekends"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Weekly Schedule
                    </Typography>
                    {formData.weeklySchedule &&
                      Object.entries(formData.weeklySchedule).map(
                        ([day, schedule]) => (
                          <Box
                            key={day}
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 2,
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <Typography sx={{ minWidth: 100 }}>
                              {day}
                            </Typography>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={schedule.enabled}
                                  onChange={(e) =>
                                    handleWeeklyScheduleChange(
                                      day,
                                      "enabled",
                                      e.target.checked,
                                    )
                                  }
                                />
                              }
                              label="Enabled"
                            />
                            <TextField
                              label="Start"
                              type="time"
                              value={schedule.start}
                              onChange={(e) =>
                                handleWeeklyScheduleChange(
                                  day,
                                  "start",
                                  e.target.value,
                                )
                              }
                              sx={{ width: 120 }}
                              InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                              label="End"
                              type="time"
                              value={schedule.end}
                              onChange={(e) =>
                                handleWeeklyScheduleChange(
                                  day,
                                  "end",
                                  e.target.value,
                                )
                              }
                              sx={{ width: 120 }}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Box>
                        ),
                      )}
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Vacation Mode
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.vacationMode?.enabled || false}
                          onChange={(e) =>
                            handleVacationModeChange(
                              "enabled",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label="Enable vacation mode"
                    />
                    {formData.vacationMode?.enabled && (
                      <Box sx={{ mt: 2 }}>
                        <TextField
                          label="Pause Until"
                          type="datetime-local"
                          value={
                            formData.vacationMode?.pauseUntil
                              ? new Date(formData.vacationMode.pauseUntil)
                                  .toISOString()
                                  .slice(0, 16)
                              : ""
                          }
                          onChange={(e) =>
                            handleVacationModeChange(
                              "pauseUntil",
                              e.target.value,
                            )
                          }
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={
                                formData.vacationMode?.autoReject || false
                              }
                              onChange={(e) =>
                                handleVacationModeChange(
                                  "autoReject",
                                  e.target.checked,
                                )
                              }
                            />
                          }
                          label="Automatically reject leads"
                        />
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* BUDGET & VOLUME LIMITS */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Budget & Volume Limits</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Budget Cap Type</InputLabel>
                      <Select
                        name="budgetCapType"
                        value={formData.budgetCapType}
                        onChange={handleSelectChange}
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
                      label="Budget Limit (Credits/Units)"
                      name="budgetLimitAmount"
                      type="number"
                      value={formData.budgetLimitAmount}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 0 }}
                      helperText="Total credits/units limit for selected period"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Volume Limit Count"
                      name="volumeLimitCount"
                      type="number"
                      value={formData.volumeLimitCount}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Max Concurrent Leads"
                      name="maxConcurrentLeads"
                      type="number"
                      value={formData.maxConcurrentLeads}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* DISTRIBUTION & NOTIFICATIONS */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Distribution & Notifications
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Preferred Distribution Method</InputLabel>
                      <Select
                        name="preferredDistribution"
                        value={formData.preferredDistribution}
                        onChange={handleSelectChange}
                        label="Preferred Distribution Method"
                      >
                        <MenuItem value="Automatic">
                          Automatic (Auto Assign)
                        </MenuItem>
                        <MenuItem value="Manual">Manual (Marketplace)</MenuItem>
                        <MenuItem value="Both">Both</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      • <strong>Automatic:</strong> Leads auto-assigned based on
                      criteria
                      <br />• <strong>Manual:</strong> Browse and purchase from
                      marketplace
                      <br />• <strong>Both:</strong> Receive both auto-assigned
                      and marketplace leads
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Notification Preferences</InputLabel>
                      <Select
                        name="notificationPreferences"
                        value={formData.notificationPreferences || []}
                        onChange={handleNotificationPreferencesChange}
                        label="Notification Preferences"
                        multiple
                      >
                        <MenuItem value="Email">Email</MenuItem>
                        <MenuItem value="SMS">SMS</MenuItem>
                        <MenuItem value="In-App Notification">
                          In-App Notification
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="autoAcceptMatchingLeads"
                          checked={formData.autoAcceptMatchingLeads || false}
                          onChange={handleCheckboxChange}
                        />
                      }
                      label="Auto-accept leads matching my criteria"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : initialValues ? (
              "Save Changes"
            ) : (
              "Register"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BuyerFormEnhanced;
