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
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

interface UnitPricingOption {
  units: number;
  cost: number;
}

const UnitPricingComponent: React.FC = () => {
  const [unitPricingOptions, setUnitPricingOptions] = useState<
    UnitPricingOption[]
  >([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [units, setUnits] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
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

  // Fetch unit pricing options on component mount
  useEffect(() => {
    const fetchUnitPricingOptions = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/settings/unitsettingapi", {
          method: "GET",
        });
        const data = await response.json();
        if (response.ok) {
          setUnitPricingOptions(data.unitPricingOptions);
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

    fetchUnitPricingOptions();
  }, []);

  const handleAddOrUpdate = async () => {
    if (units <= 0 || cost <= 0) {
      setSnackbar({
        open: true,
        message: "Units and cost must be greater than 0.",
        severity: "error",
      });
      return;
    }

    const endpoint =
      editIndex !== null
        ? "/api/settings/unitsettingapi"
        : "/api/settings/unitsettingapi";
    const method = editIndex !== null ? "PUT" : "POST";
    const payload =
      editIndex !== null ? { units, cost, index: editIndex } : { units, cost };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        setUnitPricingOptions(data.unitPricingOptions);
        setSnackbar({ open: true, message: data.message, severity: "success" });
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
  };

  const handleDelete = async (index: number) => {
    try {
      const response = await fetch("/api/unit-pricing", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const data = await response.json();

      if (response.ok) {
        setUnitPricingOptions(data.unitPricingOptions);
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
    setEditIndex(null);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Unit Pricing Options
      </Typography>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>
          {editIndex !== null ? "Edit Unit Pricing" : "Add Unit Pricing"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Units"
            type="number"
            fullWidth
            value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            label="Cost"
            type="number"
            fullWidth
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleAddOrUpdate} color="primary">
            {editIndex !== null ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpenDialog(true)}
        sx={{ mb: 2 }}
      >
        Add Unit Pricing
      </Button>

      {/* Table */}
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
                <TableRow key={index}>
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
            ) : unitPricingOptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No unit pricing options added yet.
                </TableCell>
              </TableRow>
            ) : (
              unitPricingOptions.map((option, index) => (
                <TableRow key={index}>
                  <TableCell>{option.units}</TableCell>
                  <TableCell>${option.cost}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        setUnits(option.units);
                        setCost(option.cost);
                        setEditIndex(index);
                        setOpenDialog(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(index)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default UnitPricingComponent;
