"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
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
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Divider,
} from "@mui/material";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableItem } from "../../components/sortableItem";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface TierLimits {
  leads: number;
  twilioNumbers: number;
  numbers: number;
  callSeconds: number;
  forms: number;
  buyers: number;
  exports: boolean;
  imports: boolean;
  liveSupport: boolean;
  industries: number;
}

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
  tierType: "free" | "paid";
  tierUserType: "seller" | "business";
  discountPercentage?: number;
  discountedPrice?: string;
  renewalPrice?: string;
  annualPrice?: string;
  tierLimits: TierLimits;
}

const defaultTierLimits: TierLimits = {
  leads: 0,
  twilioNumbers: 0,
  numbers: 0,
  callSeconds: 0,
  forms: 0,
  buyers: 0,
  exports: false,
  imports: false,
  liveSupport: false,
  industries: 0,
};

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLimits, setShowLimits] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/adminapi/tier");
      if (!response.ok) throw new Error("Failed to fetch tiers");
      const data = await response.json();
      // Ensure tierType is properly set based on price and add default limits if missing
      const processedTiers = data.map((tier: Tier) => ({
        ...tier,
        tierType: tier.price === "0" ? "free" : "paid",
        tierLimits: tier.tierLimits || { ...defaultTierLimits },
      }));
      setTiers(processedTiers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setSnackbar({
        open: true,
        message: "Failed to load tiers",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tier: Partial<Tier> | null) => {
    const baseTier = tier || {
      name: "",
      price: "",
      description: "",
      features: [],
      ctaText: "Get Started",
      highlight: false,
      isActive: true,
      order: tiers.length + 1,
      tierType: "paid",
      tierUserType: "seller",
      discountPercentage: 0,
      renewalPrice: "",
      tierLimits: { ...defaultTierLimits },
    };

    // Ensure tierType is set based on price when opening dialog
    setCurrentTier({
      ...baseTier,
      tierType: baseTier.price === "0" ? "free" : "paid",
      tierLimits: baseTier.tierLimits || { ...defaultTierLimits },
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTier(null);
    setShowAdvanced(false);
    setShowLimits(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setCurrentTier((prev) => {
      const updatedTier = {
        ...prev,
        [name]: newValue,
      };

      // Automatically update tierType when price changes
      if (name === "price") {
        return {
          ...updatedTier,
          tierType: newValue === "0" ? "free" : "paid",
        };
      }

      return updatedTier;
    });
  };

  const handleLimitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue =
      type === "checkbox" ? checked : type === "number" ? Number(value) : value;

    setCurrentTier((prev) => ({
      ...prev,
      tierLimits: {
        ...(prev?.tierLimits || { ...defaultTierLimits }),
        [name]: newValue,
      },
    }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentTier((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateDiscountedPrice = () => {
    if (!currentTier?.price || !currentTier?.discountPercentage) return "";
    const price = parseFloat(currentTier.price);
    const discount = (price * (currentTier.discountPercentage / 100)) / 12;
    return (price - discount).toFixed(2);
  };

  const calculateAnnualPrice = () => {
    const discountedPrice = parseFloat(calculateDiscountedPrice());
    return (discountedPrice * 12).toFixed(2);
  };

  const calculateRenewalPrice = () => {
    if (!currentTier?.price) return "";
    const price = parseFloat(currentTier.price);
    return (price * 12).toFixed(2);
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

      // Ensure tierType is set correctly before saving
      const tierToSave = {
        ...currentTier,
        tierType: currentTier.price === "0" ? "free" : "paid",
        discountedPrice: calculateDiscountedPrice(),
        annualPrice: calculateAnnualPrice(),
        renewalPrice: calculateRenewalPrice(),
        tierLimits: currentTier.tierLimits || { ...defaultTierLimits },
      };

      const method = currentTier._id ? "PUT" : "POST";
      const url = currentTier._id
        ? `/api/adminapi/tier?id=${currentTier._id}`
        : "/api/adminapi/tier";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tierToSave),
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
      const response = await fetch(`/api/adminapi/tier/?id=${id}`, {
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tiers.findIndex((tier) => tier._id === active.id);
    const newIndex = tiers.findIndex((tier) => tier._id === over.id);

    const updatedTiers = arrayMove(tiers, oldIndex, newIndex).map(
      (tier, index) => ({
        ...tier,
        order: index + 1,
      })
    );

    setTiers(updatedTiers);

    try {
      await fetch("/api/adminapi/tier/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers: updatedTiers }),
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to update tier order",
        severity: "error",
      });
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

  if (!Array.isArray(tiers)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Typography color="error">Invalid tiers data format</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h5" gutterBottom sx={{ mt: 6 }}>
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={tiers.map((tier) => tier._id)}
            strategy={verticalListSortingStrategy}
          >
            <List>
              {tiers
                .sort((a, b) => a.order - b.order)
                .map((tier) => (
                  <SortableItem key={tier._id} id={tier._id}>
                    <Paper elevation={2} sx={{ mb: 2 }}>
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
                              <Chip
                                label={
                                  tier.tierType === "free" ? "Free" : "Paid"
                                }
                                color={
                                  tier.tierType === "free"
                                    ? "success"
                                    : "warning"
                                }
                                size="small"
                                sx={{ ml: 1 }}
                              />
                              {tier.discountPercentage &&
                                tier.discountPercentage > 0 && (
                                  <Chip
                                    label={`Save ${tier.discountPercentage}%`}
                                    color="success"
                                    size="small"
                                    sx={{ ml: 1 }}
                                  />
                                )}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography component="span" sx={{ mr: 2 }}>
                                ${tier.price}/mo
                              </Typography>
                              {tier.tierType === "paid" &&
                                tier.discountPercentage &&
                                tier.discountPercentage > 0 && (
                                  <Typography component="span" sx={{ mr: 2 }}>
                                    Renews at $
                                    {(parseFloat(tier.price) * 12).toFixed(2)}
                                    /year
                                  </Typography>
                                )}
                              <Typography component="span">
                                {tier.description}
                              </Typography>
                            </>
                          }
                        />
                        <Box>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(tier);
                            }}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTier(tier._id);
                            }}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItem>
                    </Paper>
                  </SortableItem>
                ))}
            </List>
          </SortableContext>
        </DndContext>
      </Box>

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
                  label="Monthly Price ($)"
                  name="price"
                  value={currentTier.price || ""}
                  onChange={handleChange}
                  margin="normal"
                  type="number"
                  inputProps={{ step: "0.01" }}
                />
                {currentTier.tierType === "paid" && (
                  <>
                    <TextField
                      fullWidth
                      label="Discount Percentage (%)"
                      name="discountPercentage"
                      value={currentTier.discountPercentage || ""}
                      onChange={handleChange}
                      margin="normal"
                      type="number"
                      helperText="Enter 0 for no discount"
                      disabled={
                        (currentTier?.tierType as "free" | "paid") === "free"
                      }
                    />
                    <TextField
                      fullWidth
                      label="Renewal Price ($)"
                      name="renewalPrice"
                      value={currentTier.renewalPrice || ""}
                      onChange={handleChange}
                      margin="normal"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      helperText="Price after discount period ends"
                      disabled={
                        (currentTier?.tierType as "free" | "paid") === "free"
                      }
                    />
                  </>
                )}
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
                    label="Highlight this tier"
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

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="text"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    sx={{ mr: 2 }}
                  >
                    {showAdvanced ? "Hide" : "Show"} Advanced Options
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setShowLimits(!showLimits)}
                  >
                    {showLimits ? "Hide" : "Show"} Tier Limits
                  </Button>
                </Box>

                {showAdvanced && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      border: "1px dashed #ccc",
                      borderRadius: 1,
                    }}
                  >
                    <FormControl component="fieldset" sx={{ mb: 2 }}>
                      <FormLabel component="legend">Tier User Type</FormLabel>
                      <RadioGroup
                        name="tierUserType"
                        value={currentTier.tierUserType || "seller"}
                        onChange={handleTypeChange}
                      >
                        <FormControlLabel
                          value="seller"
                          control={<Radio />}
                          label="For Sellers"
                        />
                        <FormControlLabel
                          value="business"
                          control={<Radio />}
                          label="For Businesses"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Box>
                )}

                {showLimits && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      border: "1px dashed #ccc",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      Tier Limits
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Max Leads"
                          name="leads"
                          type="number"
                          value={currentTier.tierLimits?.leads || 0}
                          onChange={handleLimitsChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Max Twilio Numbers"
                          name="twilioNumbers"
                          type="number"
                          value={currentTier.tierLimits?.twilioNumbers || 0}
                          onChange={handleLimitsChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Max Numbers"
                          name="numbers"
                          type="number"
                          value={currentTier.tierLimits?.numbers || 0}
                          onChange={handleLimitsChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Max Call Seconds"
                          name="callSeconds"
                          type="number"
                          value={currentTier.tierLimits?.callSeconds || 0}
                          onChange={handleLimitsChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Max Forms"
                          name="forms"
                          type="number"
                          value={currentTier.tierLimits?.forms || 0}
                          onChange={handleLimitsChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Max Buyers"
                          name="buyers"
                          type="number"
                          value={currentTier.tierLimits?.buyers || 0}
                          onChange={handleLimitsChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Max Industries"
                          name="industries"
                          type="number"
                          value={currentTier.tierLimits?.industries || 0}
                          onChange={handleLimitsChange}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              name="exports"
                              checked={currentTier.tierLimits?.exports || false}
                              onChange={handleLimitsChange}
                            />
                          }
                          label="Allow Exports"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              name="imports"
                              checked={currentTier.tierLimits?.imports || false}
                              onChange={handleLimitsChange}
                            />
                          }
                          label="Allow Imports"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              name="liveSupport"
                              checked={
                                currentTier.tierLimits?.liveSupport || false
                              }
                              onChange={handleLimitsChange}
                            />
                          }
                          label="Live Support Access"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
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

                {/* Pricing Preview */}
                <Box
                  sx={{
                    mt: 4,
                    p: 2,
                    border: "1px solid #eee",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Pricing Preview:
                  </Typography>
                  {currentTier.price && (
                    <>
                      <Typography variant="h6">
                        {currentTier.name || "Tier Name"}
                      </Typography>
                      <Typography variant="h5" color="primary">
                        $
                        {currentTier.tierType === "free"
                          ? "0"
                          : currentTier.discountPercentage &&
                            currentTier.discountPercentage > 0
                          ? calculateDiscountedPrice()
                          : currentTier.price}
                        /mo
                        <Typography
                          component="span"
                          variant="h6"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          (
                          {currentTier.tierType === "free"
                            ? "100% Free Trial just for 1 month"
                            : "Monthly"}
                          )
                        </Typography>
                      </Typography>
                      {currentTier.tierType === "paid" &&
                        currentTier.discountPercentage &&
                        currentTier.discountPercentage > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Save {currentTier.discountPercentage}% on 1st year
                          </Typography>
                        )}
                      {currentTier.tierType === "paid" && (
                        <Typography variant="body2">
                          {currentTier.discountPercentage &&
                          currentTier.discountPercentage > 0 ? (
                            <>
                              <Box component="span" fontWeight="bold">
                                You pay $
                                {(
                                  parseFloat(calculateDiscountedPrice()) * 12
                                ).toFixed(2)}
                              </Box>
                              <Box component="span">
                                {" "}
                                - renews at $
                                {currentTier.renewalPrice ||
                                  (parseFloat(currentTier.price) * 12).toFixed(
                                    2
                                  )}
                                /year
                              </Box>
                            </>
                          ) : (
                            <Box component="span" fontWeight="bold">
                              ${(parseFloat(currentTier.price) * 12).toFixed(2)}
                              /year
                            </Box>
                          )}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
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
