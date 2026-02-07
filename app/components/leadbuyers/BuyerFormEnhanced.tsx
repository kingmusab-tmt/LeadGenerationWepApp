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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { IBuyer } from "@/models/leadbuyers";
import { industryNiches } from "@/utils/industryNiches";
import { usCities } from "@/utils/citiesInUsUk";
import LoadingComponent from "../generalComponent/loadingcomponent";
import { timezones } from "@/utils/timezones";

// US States
const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

interface BuyerFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (buyerData: Partial<IBuyer> & { sellerId: string }) => Promise<void>;
  initialValues?: Partial<IBuyer>;
  sellerId: string;
}

const BuyerFormEnhanced: React.FC<BuyerFormProps> = ({
  open,
  onClose,
  onSave,
  initialValues,
  sellerId,
}) => {
  const [formData, setFormData] = useState<Partial<IBuyer>>({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "new",
    leadPreferences: {
      location: "",
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
    radiusFlexibility: "strict",
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
    serviceRadius: 25,
    preferredContactMethods: ["phone", "email"],
    priorityBySource: [],
    priorityByIndustry: [],
    priorityByLocation: [],
  });

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
          location: initialValues.leadPreferences?.location || "",
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
        maxLeadsPerDay: initialValues.maxLeadsPerDay || 5,
        qualificationScoreMinimum: initialValues.qualificationScoreMinimum || 0,
        maxPricePerLead: initialValues.maxPricePerLead || 0,
        leadTypes: initialValues.leadTypes || ["shared"],
        priority: initialValues.priority || 5,
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
        budgetLimitAmount: initialValues.budgetLimitAmount || 0,
        volumeLimitCount: initialValues.volumeLimitCount || 0,
        maxConcurrentLeads: initialValues.maxConcurrentLeads || 10,
        autoAcceptMatchingLeads: initialValues.autoAcceptMatchingLeads || false,
        locationMatchingStrict: initialValues.locationMatchingStrict || false,
        radiusFlexibility: initialValues.radiusFlexibility || "strict",
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
        maxLeadAge: initialValues.maxLeadAge || 24,
        serviceRadius: initialValues.serviceRadius || 25,
        preferredContactMethods: initialValues.preferredContactMethods || [
          "phone",
          "email",
        ],
        priorityBySource: initialValues.priorityBySource || [],
        priorityByIndustry: initialValues.priorityByIndustry || [],
        priorityByLocation: initialValues.priorityByLocation || [],
      });
    }
  }, [initialValues]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = "Full Name is required";
    if (!formData.company) newErrors.company = "Company is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.phone) newErrors.phone = "Phone Number is required";
    if (!formData.timezone) newErrors.timezone = "Timezone is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleVacationModeChange = (field: string, value: any) => {
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
    field: string,
    value: any,
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

  const handlePreferredZoneChange = (
    field: "city" | "state" | "zipCodes",
    value: string | string[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      preferredZones: [
        {
          city:
            field === "city"
              ? Array.isArray(value)
                ? value.join(", ")
                : value
              : prev.preferredZones?.[0]?.city || "",
          state:
            field === "state"
              ? Array.isArray(value)
                ? value.join(", ")
                : value
              : prev.preferredZones?.[0]?.state || "",
          zipCodes:
            field === "zipCodes"
              ? typeof value === "string"
                ? value
                    .split(",")
                    .map((z) => z.trim())
                    .filter(Boolean)
                : value
              : prev.preferredZones?.[0]?.zipCodes || [],
        },
      ],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitting(true);
      try {
        await onSave({ ...formData, sellerId });
        setSnackbar({
          open: true,
          message: "Buyer saved successfully!",
          severity: "success",
        });
        onClose();
      } catch (error) {
        console.error("Failed to save buyer:", error);
        setSnackbar({
          open: true,
          message: "Failed to save buyer. Please try again.",
          severity: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>
          {initialValues ? "Edit Buyer" : "Register Buyer"}
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
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="suspended">Suspended</MenuItem>
                      </Select>
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
                    <FormControl fullWidth required error={!!errors.timezone}>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleSelectChange}
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
                      {errors.timezone && (
                        <Typography color="error" variant="caption">
                          {errors.timezone}
                        </Typography>
                      )}
                    </FormControl>
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
                    <FormControl fullWidth>
                      <InputLabel>Preferred Cities</InputLabel>
                      <Select
                        name="preferredCities"
                        value={
                          formData.preferredZones?.[0]?.city
                            ?.split(", ")
                            .filter(Boolean) || []
                        }
                        onChange={(e) =>
                          handlePreferredZoneChange("city", e.target.value)
                        }
                        label="Preferred Cities"
                        multiple
                      >
                        {usCities.map((city) => (
                          <MenuItem key={city} value={city}>
                            {city}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mt: 0.5 }}
                      >
                        Cities to include only
                      </Typography>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Preferred States</InputLabel>
                      <Select
                        name="preferredStates"
                        value={
                          formData.preferredZones?.[0]?.state
                            ?.split(", ")
                            .filter(Boolean) || []
                        }
                        onChange={(e) =>
                          handlePreferredZoneChange("state", e.target.value)
                        }
                        label="Preferred States"
                        multiple
                      >
                        {US_STATES.map((state) => (
                          <MenuItem key={state} value={state}>
                            {state}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mt: 0.5 }}
                      >
                        States to include only
                      </Typography>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Preferred Zip Codes"
                      name="preferredZipCodes"
                      value={
                        formData.preferredZones?.[0]?.zipCodes?.join(", ") || ""
                      }
                      onChange={(e) =>
                        handlePreferredZoneChange("zipCodes", e.target.value)
                      }
                      fullWidth
                      placeholder="e.g. 88901, 89104"
                      helperText="Zipcodes to include only (comma separated)"
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

                  {/* LOCATION MATCHING FLEXIBILITY */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Location Matching Flexibility</InputLabel>
                      <Select
                        name="radiusFlexibility"
                        value={formData.radiusFlexibility}
                        onChange={handleSelectChange}
                        label="Location Matching Flexibility"
                      >
                        <MenuItem value="strict">Strict (Exact Match)</MenuItem>
                        <MenuItem value="soft">Soft (Close Match)</MenuItem>
                        <MenuItem value="flexible">Flexible (Any)</MenuItem>
                      </Select>
                    </FormControl>
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

                  {/* SERVICE RADIUS */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Service Radius (Miles)"
                      name="serviceRadius"
                      type="number"
                      value={formData.serviceRadius}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 1, max: 500 }}
                      helperText="Geographic coverage radius"
                    />
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
                    <TextField
                      label="Minimum Qualification Score"
                      name="qualificationScoreMinimum"
                      type="number"
                      value={formData.qualificationScoreMinimum}
                      onChange={handleNumberChange}
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
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
              <LoadingComponent />
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
