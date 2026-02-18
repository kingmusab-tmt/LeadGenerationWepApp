"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Switch,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
import { usCities } from "@/utils/citiesInUsUk";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface ServiceLocation {
  city: string;
  state: string;
  country: string;
  zipCodes?: string[];
  radius?: number;
}

export default function ServiceLocationsSettings() {
  const fetchWithCSRF = useCSRFFetch();
  const [serviceLocations, setServiceLocations] = useState<ServiceLocation[]>(
    [],
  );
  const [locationMatchingStrict, setLocationMatchingStrict] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Form state
  const [newLocation, setNewLocation] = useState<ServiceLocation>({
    city: "",
    state: "",
    country: "USA",
    zipCodes: [],
    radius: 25,
  });
  const [zipCodeInput, setZipCodeInput] = useState("");

  useEffect(() => {
    fetchServiceLocations();
  }, []);

  const fetchServiceLocations = async () => {
    try {
      const response = await fetch("/api/buyers/service-locations");
      const data = await response.json();

      if (data.success) {
        setServiceLocations(data.serviceLocations || []);
        setLocationMatchingStrict(data.locationMatchingStrict || false);
      }
    } catch (error) {
      console.error("Error fetching service locations:", error);
      setSnackbar({
        open: true,
        message: "Failed to load service locations",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = () => {
    setNewLocation({
      city: "",
      state: "",
      country: "USA",
      zipCodes: [],
      radius: 25,
    });
    setZipCodeInput("");
    setEditIndex(null);
    setDialogOpen(true);
  };

  const handleEditLocation = (index: number) => {
    const location = serviceLocations[index];
    setNewLocation({ ...location });
    setZipCodeInput(location.zipCodes?.join(", ") || "");
    setEditIndex(index);
    setDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    if (!newLocation.city || !newLocation.state) {
      setSnackbar({
        open: true,
        message: "City and State are required",
        severity: "error",
      });
      return;
    }

    // Parse zip codes from comma-separated input
    const zipCodes = zipCodeInput
      .split(",")
      .map((zip) => zip.trim())
      .filter((zip) => zip.length > 0);

    const locationToSave = {
      ...newLocation,
      zipCodes,
    };

    try {
      let updatedLocations;

      if (editIndex !== null) {
        // Update existing location
        updatedLocations = [...serviceLocations];
        updatedLocations[editIndex] = locationToSave;
      } else {
        // Add new location
        updatedLocations = [...serviceLocations, locationToSave];
      }

      const response = await fetchWithCSRF("/api/buyers/service-locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceLocations: updatedLocations,
          locationMatchingStrict,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setServiceLocations(data.serviceLocations);
        setDialogOpen(false);
        setSnackbar({
          open: true,
          message:
            editIndex !== null
              ? "Service location updated successfully"
              : "Service location added successfully",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: data.error || "Failed to save service location",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error saving service location:", error);
      setSnackbar({
        open: true,
        message: "An error occurred while saving",
        severity: "error",
      });
    }
  };

  const handleDeleteLocation = async (index: number) => {
    if (!confirm("Are you sure you want to remove this service location?")) {
      return;
    }

    try {
      const updatedLocations = serviceLocations.filter((_, i) => i !== index);

      const response = await fetchWithCSRF("/api/buyers/service-locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceLocations: updatedLocations,
          locationMatchingStrict,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setServiceLocations(data.serviceLocations);
        setSnackbar({
          open: true,
          message: "Service location removed successfully",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error deleting service location:", error);
      setSnackbar({
        open: true,
        message: "Failed to remove service location",
        severity: "error",
      });
    }
  };

  const handleToggleStrictMatching = async () => {
    const newValue = !locationMatchingStrict;

    try {
      const response = await fetchWithCSRF("/api/buyers/service-locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceLocations,
          locationMatchingStrict: newValue,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLocationMatchingStrict(newValue);
        setSnackbar({
          open: true,
          message: "Settings updated successfully",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error updating strict matching:", error);
      setSnackbar({
        open: true,
        message: "Failed to update settings",
        severity: "error",
      });
    }
  };

  // Extract unique cities from the utility
  // Note: usCities is an array of city names, we'll parse them to extract state info
  const cityOptions = usCities.sort();
  const stateOptions = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Service Locations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddLocation}
        >
          Add Location
        </Button>
      </Box>

      {/* Strict Matching Toggle */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={locationMatchingStrict}
                  onChange={handleToggleStrictMatching}
                />
              }
              label="Strict Location Matching"
            />
            <Tooltip title="When enabled, you will only receive leads from your specified service locations. When disabled, you'll receive all leads but leads from your service locations will be prioritized.">
              <InfoIcon color="action" fontSize="small" />
            </Tooltip>
          </Box>
          <Chip
            label={locationMatchingStrict ? "Strict Mode" : "Flexible Mode"}
            color={locationMatchingStrict ? "error" : "success"}
            size="small"
          />
        </Box>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ mt: 1, display: "block" }}
        >
          {locationMatchingStrict
            ? "You will only receive leads from your specified service locations."
            : "You will receive all qualified leads, with priority given to those in your service locations."}
        </Typography>
      </Paper>

      {/* Service Locations List */}
      {serviceLocations.length === 0 ? (
        <Alert severity="info">
          No service locations configured. Add locations to enable
          location-based lead routing.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {serviceLocations.map((location, index) => (
            <Grid size={{ xs: 12, md: 6 }} key={index}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <LocationOnIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {location.city}, {location.state}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        gutterBottom
                      >
                        {location.country}
                      </Typography>
                      {location.radius && (
                        <Typography variant="body2" color="textSecondary">
                          Service Radius: {location.radius} miles
                        </Typography>
                      )}
                      {location.zipCodes && location.zipCodes.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            Zip Codes:
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                              mt: 0.5,
                            }}
                          >
                            {location.zipCodes.map((zip, zipIndex) => (
                              <Chip key={zipIndex} label={zip} size="small" />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditLocation(index)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLocation(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Location Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editIndex !== null
            ? "Edit Service Location"
            : "Add Service Location"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={cityOptions}
                  value={newLocation.city}
                  onChange={(_, value) =>
                    setNewLocation({ ...newLocation, city: value || "" })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="City" required fullWidth />
                  )}
                  freeSolo
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={stateOptions}
                  value={newLocation.state}
                  onChange={(_, value) =>
                    setNewLocation({ ...newLocation, state: value || "" })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="State" required fullWidth />
                  )}
                  freeSolo
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Country"
                  value={newLocation.country}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, country: e.target.value })
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Service Radius (miles)"
                  type="number"
                  value={newLocation.radius}
                  onChange={(e) =>
                    setNewLocation({
                      ...newLocation,
                      radius: parseInt(e.target.value) || 25,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Zip Codes (comma-separated)"
                  value={zipCodeInput}
                  onChange={(e) => setZipCodeInput(e.target.value)}
                  placeholder="12345, 12346, 12347"
                  helperText="Enter zip codes separated by commas"
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveLocation} variant="contained">
            {editIndex !== null ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
