"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  Theme,
  Skeleton,
  Snackbar,
  Alert,
  Box,
  Divider,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

interface UnitPricingOption {
  units: number;
  cost: number;
}

interface CallChargeOption {
  units: number;
  seconds: number;
}

interface SettingsData {
  unitPricingOptions: UnitPricingOption[];
  callChargeOptions: CallChargeOption[];
}

const UnitPricingComponent: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    unitPricingOptions: [],
    callChargeOptions: [],
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editType, setEditType] = useState<"unit" | "call">("unit");
  const [units, setUnits] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [callUnits, setCallUnits] = useState<number>(0);
  const [callSeconds, setCallSeconds] = useState<number>(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/settings/unitsettingapi", {
          method: "GET",
        });
        const data = await response.json();
        if (response.ok) {
          setSettings({
            unitPricingOptions: data.unitPricingOptions || [],
            callChargeOptions: data.callChargeOptions || [],
          });
        } else {
          setSnackbar({
            open: true,
            message: data.error || "Failed to fetch data",
            severity: "error",
          });
        }
      } catch (error) {
        setSnackbar({
          open: true,
          message: "An error occurred",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleAddOrUpdate = async () => {
    if (editType === "unit") {
      if (units <= 0 || cost <= 0) {
        setSnackbar({
          open: true,
          message: "Units and cost must be greater than 0.",
          severity: "error",
        });
        return;
      }

      const endpoint = "/api/settings/unitsettingapi";
      const method = editIndex !== null ? "PUT" : "POST";
      const payload = {
        type: "unit",
        data: { units, cost },
        index: editIndex,
      };

      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (response.ok) {
          setSettings({
            ...settings,
            unitPricingOptions: data.unitPricingOptions,
          });
          setSnackbar({
            open: true,
            message: data.message,
            severity: "success",
          });
          setUnits(0);
          setCost(0);
          setEditIndex(null);
          setOpenDialog(false);
        } else {
          setSnackbar({
            open: true,
            message: data.error || "An error occurred",
            severity: "error",
          });
        }
      } catch (error) {
        setSnackbar({
          open: true,
          message: "An error occurred",
          severity: "error",
        });
      }
    } else {
      // Handle call charge options
      if (callUnits <= 0 || callSeconds <= 0) {
        setSnackbar({
          open: true,
          message: "Units and seconds must be greater than 0.",
          severity: "error",
        });
        return;
      }

      const endpoint = "/api/settings/unitsettingapi";
      const method = editIndex !== null ? "PUT" : "POST";
      const payload = {
        type: "call",
        data: { units: callUnits, seconds: callSeconds },
        index: editIndex,
      };

      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (response.ok) {
          setSettings({
            ...settings,
            callChargeOptions: data.callChargeOptions,
          });
          setSnackbar({
            open: true,
            message: data.message,
            severity: "success",
          });
          setCallUnits(0);
          setCallSeconds(0);
          setEditIndex(null);
          setOpenDialog(false);
        } else {
          setSnackbar({
            open: true,
            message: data.error || "An error occurred",
            severity: "error",
          });
        }
      } catch (error) {
        setSnackbar({
          open: true,
          message: "An error occurred",
          severity: "error",
        });
      }
    }
  };

  const handleDelete = async (type: "unit" | "call", index: number) => {
    try {
      const response = await fetch("/api/settings/unitsettingapi", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, index }),
      });
      const data = await response.json();

      if (response.ok) {
        setSettings({
          ...settings,
          unitPricingOptions:
            type === "unit"
              ? data.unitPricingOptions
              : settings.unitPricingOptions,
          callChargeOptions:
            type === "call"
              ? data.callChargeOptions
              : settings.callChargeOptions,
        });
        setSnackbar({ open: true, message: data.message, severity: "success" });
      } else {
        setSnackbar({
          open: true,
          message: data.error || "An error occurred",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "An error occurred",
        severity: "error",
      });
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setUnits(0);
    setCost(0);
    setCallUnits(0);
    setCallSeconds(0);
    setEditIndex(null);
  };

  const openAddDialog = (type: "unit" | "call") => {
    setEditType(type);
    setOpenDialog(true);
  };

  const openEditDialog = (type: "unit" | "call", index: number) => {
    setEditType(type);
    setEditIndex(index);
    if (type === "unit") {
      setUnits(settings.unitPricingOptions[index].units);
      setCost(settings.unitPricingOptions[index].cost);
    } else {
      setCallUnits(settings.callChargeOptions[index].units);
      setCallSeconds(settings.callChargeOptions[index].seconds);
    }
    setOpenDialog(true);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Pricing Settings
      </Typography>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editIndex !== null
            ? `Edit ${editType === "unit" ? "Unit Pricing" : "Call Charge"}`
            : `Add ${editType === "unit" ? "Unit Pricing" : "Call Charge"}`}
        </DialogTitle>
        <DialogContent>
          {editType === "unit" ? (
            <>
              <TextField
                label="Units"
                type="number"
                fullWidth
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                sx={{ mb: 2, mt: 2 }}
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Cost ($)"
                type="number"
                fullWidth
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                inputProps={{ min: 0.01, step: 0.01 }}
              />
            </>
          ) : (
            <>
              <TextField
                label="Units"
                type="number"
                fullWidth
                value={callUnits}
                onChange={(e) => setCallUnits(Number(e.target.value))}
                sx={{ mb: 2, mt: 2 }}
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Seconds"
                type="number"
                fullWidth
                value={callSeconds}
                onChange={(e) => setCallSeconds(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                This means {callUnits || 0} units will be charged per{" "}
                {callSeconds || 0} seconds of call duration
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleAddOrUpdate} color="primary">
            {editIndex !== null ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unit Pricing Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1">Unit Pricing Packages</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => openAddDialog("unit")}
          >
            Add Unit Package
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Units</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`unit-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rectangular" width={100} height={30} />
                    </TableCell>
                  </TableRow>
                ))
              ) : settings.unitPricingOptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No unit pricing packages added yet.
                  </TableCell>
                </TableRow>
              ) : (
                settings.unitPricingOptions.map((option, index) => (
                  <TableRow key={`unit-${index}`}>
                    <TableCell>{option.units}</TableCell>
                    <TableCell>${option.cost.toFixed(2)}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => openEditDialog("unit", index)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete("unit", index)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Call Charge Section */}
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1">Call Charge Rates</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => openAddDialog("call")}
          >
            Add Call Charge
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Units</TableCell>
                <TableCell>Seconds</TableCell>
                <TableCell>Rate</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`call-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rectangular" width={100} height={30} />
                    </TableCell>
                  </TableRow>
                ))
              ) : settings.callChargeOptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No call charge rates added yet.
                  </TableCell>
                </TableRow>
              ) : (
                settings.callChargeOptions.map((option, index) => (
                  <TableRow key={`call-${index}`}>
                    <TableCell>{option.units}</TableCell>
                    <TableCell>{option.seconds}</TableCell>
                    <TableCell>
                      {option.units} units / {option.seconds} sec
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => openEditDialog("call", index)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete("call", index)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

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
    </Paper>
  );
};

export default UnitPricingComponent;
