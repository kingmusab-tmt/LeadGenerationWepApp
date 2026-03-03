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
  CircularProgress,
} from "@mui/material";
import { IBuyer } from "@/models/leadbuyers";
import { industryNiches } from "@/utils/industryNiches";
import GooglePlacesAutocomplete from "../GooglePlacesAutocomplete";
import GoogleTimezoneAutocomplete from "../GoogleTimezoneAutocomplete";

interface BuyerFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (buyerData: Partial<IBuyer> & { sellerId: string }) => Promise<void>;
  initialValues?: Partial<IBuyer>;
  sellerId: string;
}

const BuyerForm: React.FC<BuyerFormProps> = ({
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
    timezone: "America/New_York", // Default timezone
    maxLeadsPerDay: 5, // Default value
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
        maxLeadsPerDay: initialValues.maxLeadsPerDay || 5,
      });
    }
  }, [initialValues]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = "Full Name is required";
    if (!formData.company) newErrors.company = "Company is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.phone) newErrors.phone = "Phone Number is required";
    if (
      !formData.leadPreferences?.location ||
      formData.leadPreferences.location.length === 0
    )
      newErrors.location = "At least one location is required";
    if (!formData.leadPreferences?.industries?.length)
      newErrors.industry = "Industry is required";
    if (!formData.timezone) newErrors.timezone = "Timezone is required";
    if (!formData.workingHours?.start)
      newErrors.workingHoursStart = "Start time is required";
    if (!formData.workingHours?.end)
      newErrors.workingHoursEnd = "End time is required";
    if (formData.maxLeadsPerDay === undefined || formData.maxLeadsPerDay < 0) {
      newErrors.maxLeadsPerDay = "Must be a positive number";
    }

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

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLeadPreferencesChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      leadPreferences: {
        ...prev.leadPreferences!,
        [name as string]: name === "industries" ? [value] : value,
      },
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

  const handleMaxLeadsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      maxLeadsPerDay: isNaN(value) ? 0 : value,
    }));
  };

  const handleLocationChange = (locations: string[]) => {
    setFormData((prev) => ({
      ...prev,
      leadPreferences: {
        ...prev.leadPreferences!,
        location: locations,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitting(true);
      try {
        await onSave({ ...formData, sellerId });
        // Don't close the form here - let the parent component handle it
        // This allows the parent to show a success modal without interference
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
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {initialValues ? "Edit Buyer" : "Buyer Registration"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
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
                <FormControl fullWidth required error={!!errors.status}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleSelectChange}
                    disabled={!initialValues}
                  >
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
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

              <Grid size={{ xs: 12, md: 6 }}>
                <GooglePlacesAutocomplete
                  label="Lead Preference Location(s)"
                  value={
                    Array.isArray(formData.leadPreferences?.location)
                      ? formData.leadPreferences.location
                      : formData.leadPreferences?.location
                        ? [formData.leadPreferences.location]
                        : []
                  }
                  onChange={handleLocationChange}
                  type="city"
                  placeholder="Search and select cities..."
                  helperText={
                    errors.location ||
                    "Select one or more cities for lead preferences"
                  }
                  error={!!errors.location}
                  errorText={errors.location}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required error={!!errors.industry}>
                  <InputLabel>Preferred Industry</InputLabel>
                  <Select
                    name="industries"
                    value={formData.leadPreferences?.industries?.[0] || ""}
                    onChange={handleLeadPreferencesChange}
                    label="Preferred Industry"
                  >
                    {industryNiches.map((niche) => (
                      <MenuItem key={niche.value} value={niche.value}>
                        {niche.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.industry && (
                    <Typography color="error" variant="caption">
                      {errors.industry}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Working Hours
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
                      required
                      error={!!errors.workingHoursStart}
                      helperText={errors.workingHoursStart}
                      InputLabelProps={{
                        shrink: true,
                      }}
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
                      required
                      error={!!errors.workingHoursEnd}
                      helperText={errors.workingHoursEnd}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Max Leads Per Day"
                  name="maxLeadsPerDay"
                  type="number"
                  value={formData.maxLeadsPerDay}
                  onChange={handleMaxLeadsChange}
                  fullWidth
                  required
                  error={!!errors.maxLeadsPerDay}
                  helperText={
                    errors.maxLeadsPerDay ||
                    "Maximum leads this buyer can receive daily"
                  }
                  inputProps={{
                    min: 0,
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Preferred Distribution</InputLabel>
                  <Tooltip
                    title={
                      <>
                        <strong>Automatic:</strong> Leads are automatically
                        assigned to you based on your preference.
                        <br />
                        <strong>Manual:</strong> Purchase leads directly on your
                        dashboard marketplace.
                        <br />
                        <strong>Both:</strong> Be assigned leads using both
                        automatic and manual methods.
                      </>
                    }
                    placement="top"
                  >
                    <Select
                      name="preferredDistribution"
                      value={formData.preferredDistribution}
                      onChange={handleSelectChange}
                      label="Preferred Distribution"
                    >
                      <MenuItem value="Automatic">Automatic</MenuItem>
                      <MenuItem value="Manual">Manual</MenuItem>
                      <MenuItem value="Both">Both</MenuItem>
                    </Select>
                  </Tooltip>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Notification Preference</InputLabel>
                  <Tooltip
                    title="How would you like to be notified of new leads? Multiple Selection is allowed"
                    placement="top"
                  >
                    <Select
                      name="notificationPreferences"
                      value={formData.notificationPreferences}
                      onChange={handleNotificationPreferencesChange}
                      label="Notification Preference(s)"
                      multiple
                    >
                      <MenuItem value="Email">Email</MenuItem>
                      <MenuItem value="SMS">SMS</MenuItem>
                      <MenuItem value="In-App Notification">
                        In-App Notification
                      </MenuItem>
                    </Select>
                  </Tooltip>
                </FormControl>
              </Grid>
            </Grid>
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

export default BuyerForm;
