"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  ListItemIcon,
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface Tier {
  _id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  order: number;
}

const TierManagement = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTier, setCurrentTier] = useState<Partial<Tier> | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/tiers");
      if (!response.ok) throw new Error("Failed to fetch tiers");
      const data = await response.json();
      setTiers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tier: Partial<Tier> | null) => {
    setCurrentTier(
      tier || {
        name: "",
        price: "",
        description: "",
        features: [],
        ctaText: "Get Started",
        highlight: false,
        isActive: true,
        order: tiers.length + 1,
      }
    );
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTier(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCurrentTier((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim() && currentTier) {
      setCurrentTier((prev) => ({
        ...prev,
        features: [...(prev?.features || []), newFeature.trim()],
      }));
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    if (currentTier) {
      setCurrentTier((prev) => ({
        ...prev,
        features: (prev?.features || []).filter((_, i) => i !== index),
      }));
    }
  };

  const handleSaveTier = async () => {
    try {
      if (!currentTier) return;

      const method = currentTier._id ? "PUT" : "POST";
      const url = currentTier._id
        ? `/api/admin/tiers/${currentTier._id}`
        : "/api/admin/tiers";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentTier),
      });

      if (!response.ok) throw new Error("Failed to save tier");

      setSnackbar({
        open: true,
        message: `Tier ${currentTier._id ? "updated" : "created"} successfully`,
        severity: "success",
      });
      fetchTiers();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to save tier",
        severity: "error",
      });
    }
  };

  const handleDeleteTier = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/tiers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete tier");

      setSnackbar({
        open: true,
        message: "Tier deleted successfully",
        severity: "success",
      });
      fetchTiers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to delete tier",
        severity: "error",
      });
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(tiers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order based on new position
    const updatedTiers = items.map((tier, index) => ({
      ...tier,
      order: index + 1,
    }));

    setTiers(updatedTiers);

    try {
      await fetch("/api/admin/tiers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tiers: updatedTiers }),
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to update tier order",
        severity: "error",
      });
      // Revert if failed
      fetchTiers();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Typography>Loading tiers...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          Pricing Tiers Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(null)}
          sx={{ mb: 3 }}
        >
          Add New Tier
        </Button>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tiers">
            {(provided) => (
              <List {...provided.droppableProps} ref={provided.innerRef}>
                {tiers
                  .sort((a, b) => a.order - b.order)
                  .map((tier, index) => (
                    <Draggable
                      key={tier._id}
                      draggableId={tier._id}
                      index={index}
                    >
                      {(provided) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          elevation={2}
                          sx={{ mb: 2 }}
                        >
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center">
                                  <Typography variant="h6" sx={{ mr: 2 }}>
                                    {tier.name}
                                  </Typography>
                                  {tier.highlight && (
                                    <Chip
                                      label="Highlighted"
                                      color="primary"
                                      size="small"
                                      sx={{ mr: 1 }}
                                    />
                                  )}
                                  {!tier.isActive && (
                                    <Chip
                                      label="Inactive"
                                      color="secondary"
                                      size="small"
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography component="span" sx={{ mr: 2 }}>
                                    {tier.price}/month
                                  </Typography>
                                  <Typography component="span">
                                    {tier.description}
                                  </Typography>
                                </>
                              }
                            />
                            <Box>
                              <IconButton
                                onClick={() => handleOpenDialog(tier)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                onClick={() => handleDeleteTier(tier._id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </ListItem>
                        </Paper>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
      </Box>

      {/* Tier Edit/Create Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {currentTier?._id ? "Edit Tier" : "Create New Tier"}
        </DialogTitle>
        <DialogContent>
          {currentTier && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tier Name"
                  name="name"
                  value={currentTier.name || ""}
                  onChange={handleChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Price"
                  name="price"
                  value={currentTier.price || ""}
                  onChange={handleChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={currentTier.description || ""}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={2}
                />
                <TextField
                  fullWidth
                  label="Button Text"
                  name="ctaText"
                  value={currentTier.ctaText || ""}
                  onChange={handleChange}
                  margin="normal"
                />
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="highlight"
                        checked={currentTier.highlight || false}
                        onChange={handleChange}
                      />
                    }
                    label="Highlight this tier (Most Popular)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        name="isActive"
                        checked={currentTier.isActive !== false}
                        onChange={handleChange}
                      />
                    }
                    label="Active"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Features
                </Typography>
                <Box display="flex" mb={2}>
                  <TextField
                    fullWidth
                    label="Add Feature"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddFeature()}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddFeature}
                    sx={{ ml: 2 }}
                  >
                    Add
                  </Button>
                </Box>
                <List dense>
                  {currentTier.features?.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={feature} />
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveFeature(index)}
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveTier} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity as any}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TierManagement;
