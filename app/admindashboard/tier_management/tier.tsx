"use client";
import React, { useState, useEffect, useCallback } from "react";
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
  Tooltip,
  Badge,
  MenuItem,
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
import PreviewIcon from "@mui/icons-material/Preview";
import PeopleIcon from "@mui/icons-material/People";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useNotification } from "@/lib/useNotification";

interface TierLimits {
  // Core Limits
  forms: number;
  leads: number;
  buyers: number;
  industries: number;

  // Call Tracking & Telephony
  numbers: number;
  twilioNumbers: number;
  callSeconds: number;
  callRecording: boolean;
  callTranscription: boolean;
  callAIAnalysis: boolean;
  multiRingForwarding: boolean;
  geoRouting: boolean;
  scheduledCallbacks: boolean;
  concurrentCallLimit: number;

  // Marketing & Campaigns
  emailCampaignsPerMonth: number;
  smsCampaignsPerMonth: number;
  emailRecipientsPerCampaign: number;
  smsRecipientsPerCampaign: number;

  // Automation & Workflows
  automationWorkflows: number;
  automationActionsPerWorkflow: number;

  // AI & Advanced Features
  chatbotEnabled: boolean;
  leadScoringEnabled: boolean;
  sentimentAnalysisEnabled: boolean;
  aiSummariesEnabled: boolean;

  // Invoicing & Payments
  invoicesPerMonth: number;
  customInvoiceBranding: boolean;

  // Integrations
  zapierIntegration: boolean;
  webhookIntegration: boolean;
  apiAccess: boolean;
  maxWebhooks: number;

  // Marketplace & Distribution
  marketplaceAccess: boolean;
  exclusiveLeads: boolean;
  leadDistributionRules: boolean;

  // Data & Reporting
  exports: boolean;
  imports: boolean;
  advancedReports: boolean;
  dataRetentionDays: number;

  // Team & Access
  teamMembers: number;
  maxConcurrentSessions: number;

  // Support
  liveSupport: boolean;
  prioritySupport: boolean;

  // Customization
  customBranding: boolean;
  customDomain: boolean;
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
  discountDuration?: "once" | "forever" | "repeating";
  discountDurationMonths?: number;
  tierLimits: TierLimits;
}

const defaultTierLimits: TierLimits = {
  // Core Limits
  forms: 1,
  leads: 100,
  buyers: 5,
  industries: 1,

  // Call Tracking & Telephony
  numbers: 1,
  twilioNumbers: 0,
  callSeconds: 1000,
  callRecording: false,
  callTranscription: false,
  callAIAnalysis: false,
  multiRingForwarding: false,
  geoRouting: false,
  scheduledCallbacks: false,
  concurrentCallLimit: 1,

  // Marketing & Campaigns
  emailCampaignsPerMonth: 0,
  smsCampaignsPerMonth: 0,
  emailRecipientsPerCampaign: 100,
  smsRecipientsPerCampaign: 50,

  // Automation & Workflows
  automationWorkflows: 0,
  automationActionsPerWorkflow: 3,

  // AI & Advanced Features
  chatbotEnabled: false,
  leadScoringEnabled: false,
  sentimentAnalysisEnabled: false,
  aiSummariesEnabled: false,

  // Invoicing & Payments
  invoicesPerMonth: 10,
  customInvoiceBranding: false,

  // Integrations
  zapierIntegration: false,
  webhookIntegration: false,
  apiAccess: false,
  maxWebhooks: 0,

  // Marketplace & Distribution
  marketplaceAccess: false,
  exclusiveLeads: false,
  leadDistributionRules: false,

  // Data & Reporting
  exports: false,
  imports: false,
  advancedReports: false,
  dataRetentionDays: 90,

  // Team & Access
  teamMembers: 1,
  maxConcurrentSessions: 1,

  // Support
  liveSupport: false,
  prioritySupport: false,

  // Customization
  customBranding: false,
  customDomain: false,
};

const TierManagement = () => {
  const csrfFetch = useCSRFFetch();
  const notify = useNotification();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [subscriberCounts, setSubscriberCounts] = useState<
    Record<string, number>
  >({});
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewTier, setPreviewTier] = useState<Tier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchTiers = useCallback(async () => {
    try {
      setLoading(true);
      const [tiersRes, countsRes] = await Promise.all([
        fetch("/api/admin/tier"),
        fetch("/api/admin/tier/subscribers"),
      ]);

      if (!tiersRes.ok) throw new Error("Failed to fetch tiers");
      const data = await tiersRes.json();
      const processedTiers = data.map((tier: Tier) => ({
        ...tier,
        tierType: tier.price === "0" ? "free" : "paid",
        tierLimits: tier.tierLimits || { ...defaultTierLimits },
      }));
      setTiers(processedTiers);

      if (countsRes.ok) {
        const countsData = await countsRes.json();
        setSubscriberCounts(countsData.counts || {});
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      setSnackbar({
        open: true,
        message: "Failed to load tiers",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

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
      discountDuration: "once",
      discountDurationMonths: 1,
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    const newValue = type === "checkbox" ? checked : value;

    setCurrentTier((prev) => {
      const updatedTier = {
        ...prev,
        [name]: type === "number" ? Number(newValue) : newValue,
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
    const discount = price * (currentTier.discountPercentage / 100);
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
        ? `/api/admin/tier?id=${currentTier._id}`
        : "/api/admin/tier";

      const response = await csrfFetch(url, {
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
      const response = await csrfFetch(`/api/admin/tier/?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete tier");

      setSnackbar({
        open: true,
        message: "Tier deleted successfully",
        severity: "success",
      });
      setDeleteConfirmId(null);
      fetchTiers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to delete tier",
        severity: "error",
      });
      setDeleteConfirmId(null);
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
      }),
    );

    setTiers(updatedTiers);

    try {
      await csrfFetch("/api/admin/tier/reorder", {
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
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {subscriberCounts[tier._id] !== undefined && (
                            <Tooltip
                              title={`${subscriberCounts[tier._id]} subscriber(s)`}
                            >
                              <Badge
                                badgeContent={subscriberCounts[tier._id]}
                                color="info"
                                showZero
                                max={9999}
                                sx={{ mr: 1 }}
                              >
                                <PeopleIcon fontSize="small" color="action" />
                              </Badge>
                            </Tooltip>
                          )}
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(tier);
                            }}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <Tooltip title="Preview">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTier(tier);
                              }}
                              color="default"
                            >
                              <PreviewIcon />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(tier._id);
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
              <Grid size={{ xs: 12, md: 6 }}>
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
                    {currentTier.discountPercentage &&
                      currentTier.discountPercentage > 0 && (
                        <>
                          <TextField
                            select
                            fullWidth
                            label="Discount Duration"
                            name="discountDuration"
                            value={currentTier.discountDuration || "once"}
                            onChange={handleChange}
                            margin="normal"
                            helperText="When the discount applies"
                          >
                            <MenuItem value="once">First payment only</MenuItem>
                            <MenuItem value="forever">
                              Forever (all payments)
                            </MenuItem>
                            <MenuItem value="repeating">
                              Repeating (N months)
                            </MenuItem>
                          </TextField>
                          {currentTier.discountDuration === "repeating" && (
                            <TextField
                              fullWidth
                              label="Discount Duration (months)"
                              name="discountDurationMonths"
                              value={currentTier.discountDurationMonths || ""}
                              onChange={handleChange}
                              margin="normal"
                              type="number"
                              inputProps={{ min: "1", step: "1" }}
                              helperText="Number of months to apply discount"
                            />
                          )}
                        </>
                      )}
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
                      maxHeight: "60vh",
                      overflowY: "auto",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      fontWeight="bold"
                    >
                      Tier Limits Configuration
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 2, display: "block" }}
                    >
                      Set 0 for unlimited. Toggle switches to enable/disable
                      features.
                    </Typography>

                    {/* Core Limits */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 2, mb: 1, color: "primary.main" }}
                    >
                      📊 Core Limits
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of forms users can create in this tier. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Max Forms"
                            name="forms"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.forms ?? 1}
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of leads that can be in the system per month. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Max Leads/Month"
                            name="leads"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.leads ?? 100}
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of buyer accounts that can be created under a seller account. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Max Buyers"
                            name="buyers"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.buyers ?? 5}
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of different industries a user can target. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Max Industries"
                            name="industries"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.industries ?? 1}
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                    </Grid>

                    {/* Call Tracking & Telephony */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      📞 Call Tracking & Telephony
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of manually added phone tracking numbers. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Tracking Numbers"
                            name="numbers"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.numbers ?? 1}
                            onChange={handleLimitsChange}
                            helperText="Manual numbers"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of Twilio phone numbers that can be allocated to this tier. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Twilio Numbers"
                            name="twilioNumbers"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.twilioNumbers ?? 0}
                            onChange={handleLimitsChange}
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum total seconds of call recordings allowed per month. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Call Seconds/Month"
                            name="callSeconds"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.callSeconds ?? 1000}
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of calls that can be active simultaneously. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Concurrent Calls"
                            name="concurrentCallLimit"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits?.concurrentCallLimit ?? 1
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="callRecording"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.callRecording ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Call Recording"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="callTranscription"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.callTranscription ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Transcription"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="callAIAnalysis"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.callAIAnalysis ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="AI Analysis"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="multiRingForwarding"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.multiRingForwarding ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Multi-Ring"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="geoRouting"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.geoRouting ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Geo-Routing"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="scheduledCallbacks"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.scheduledCallbacks ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Scheduled Callbacks"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Marketing & Campaigns */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      📧 Marketing & Campaigns
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of email marketing campaigns that can be created per month. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Email Campaigns/Month"
                            name="emailCampaignsPerMonth"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits?.emailCampaignsPerMonth ??
                              0
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of SMS marketing campaigns that can be created per month. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="SMS Campaigns/Month"
                            name="smsCampaignsPerMonth"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits?.smsCampaignsPerMonth ?? 0
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of email recipients per campaign. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Email Recipients/Campaign"
                            name="emailRecipientsPerCampaign"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits
                                ?.emailRecipientsPerCampaign ?? 100
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of SMS recipients per campaign. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="SMS Recipients/Campaign"
                            name="smsRecipientsPerCampaign"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits
                                ?.smsRecipientsPerCampaign ?? 50
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                    </Grid>

                    {/* Automation & Workflows */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      ⚙️ Automation & Workflows
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Tooltip title="Maximum number of automation workflows that can be created. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Max Workflows"
                            name="automationWorkflows"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits?.automationWorkflows ?? 0
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Tooltip title="Maximum number of actions that can be added per workflow. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Actions per Workflow"
                            name="automationActionsPerWorkflow"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits
                                ?.automationActionsPerWorkflow ?? 3
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                    </Grid>

                    {/* AI & Advanced Features */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      🤖 AI & Advanced Features
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="chatbotEnabled"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.chatbotEnabled ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Chatbot"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="leadScoringEnabled"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.leadScoringEnabled ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Lead Scoring"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="sentimentAnalysisEnabled"
                                size="small"
                                checked={
                                  currentTier.tierLimits
                                    ?.sentimentAnalysisEnabled ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Sentiment Analysis"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="aiSummariesEnabled"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.aiSummariesEnabled ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="AI Summaries"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Invoicing & Payments */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      💳 Invoicing & Payments
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Tooltip title="Maximum number of invoices that can be generated per month. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Invoices per Month"
                            name="invoicesPerMonth"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits?.invoicesPerMonth ?? 10
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              name="customInvoiceBranding"
                              size="small"
                              checked={
                                currentTier.tierLimits?.customInvoiceBranding ??
                                false
                              }
                              onChange={handleLimitsChange}
                            />
                          }
                          label="Custom Invoice Branding"
                        />
                      </Grid>
                    </Grid>

                    {/* Integrations */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      🔗 Integrations
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Tooltip title="Maximum number of webhooks that can be configured. Use 0 for unlimited.">
                          <TextField
                            fullWidth
                            label="Max Webhooks"
                            name="maxWebhooks"
                            type="number"
                            size="small"
                            value={currentTier.tierLimits?.maxWebhooks ?? 0}
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="zapierIntegration"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.zapierIntegration ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Zapier"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="webhookIntegration"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.webhookIntegration ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Webhooks"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="apiAccess"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.apiAccess ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="API Access"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Marketplace & Distribution */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      🏪 Marketplace & Distribution
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="marketplaceAccess"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.marketplaceAccess ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Marketplace Access"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="exclusiveLeads"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.exclusiveLeads ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Exclusive Leads"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="leadDistributionRules"
                                size="small"
                                checked={
                                  currentTier.tierLimits
                                    ?.leadDistributionRules ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Distribution Rules"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Data & Reporting */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      📈 Data & Reporting
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Tooltip title="Number of days to retain data before automatic deletion. Use 0 for unlimited retention.">
                          <TextField
                            fullWidth
                            label="Data Retention (days)"
                            name="dataRetentionDays"
                            type="number"
                            size="small"
                            value={
                              currentTier.tierLimits?.dataRetentionDays ?? 90
                            }
                            onChange={handleLimitsChange}
                            helperText="0 = unlimited"
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="exports"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.exports ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Exports"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="imports"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.imports ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Imports"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="advancedReports"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.advancedReports ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Advanced Reports"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Team & Access */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      👥 Team & Access
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          label="Team Members"
                          name="teamMembers"
                          type="number"
                          size="small"
                          value={currentTier.tierLimits?.teamMembers ?? 1}
                          onChange={handleLimitsChange}
                          helperText="0 = unlimited"
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          label="Concurrent Sessions"
                          name="maxConcurrentSessions"
                          type="number"
                          size="small"
                          value={
                            currentTier.tierLimits?.maxConcurrentSessions ?? 1
                          }
                          onChange={handleLimitsChange}
                          helperText="Max logins at same time"
                        />
                      </Grid>
                    </Grid>

                    {/* Support */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      🎧 Support
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="liveSupport"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.liveSupport ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Live Support"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="prioritySupport"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.prioritySupport ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Priority Support"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Customization */}
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 3, mb: 1, color: "primary.main" }}
                    >
                      🎨 Customization
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="customBranding"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.customBranding ??
                                  false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Custom Branding"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                name="customDomain"
                                size="small"
                                checked={
                                  currentTier.tierLimits?.customDomain ?? false
                                }
                                onChange={handleLimitsChange}
                              />
                            }
                            label="Custom Domain"
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
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
                                    2,
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Tier</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this tier?</Typography>
          {deleteConfirmId && subscriberCounts[deleteConfirmId] > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This tier currently has {subscriberCounts[deleteConfirmId]} active
              subscriber(s). They will need to be migrated to another tier.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            onClick={() => deleteConfirmId && handleDeleteTier(deleteConfirmId)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tier Preview Dialog */}
      <Dialog
        open={!!previewTier}
        onClose={() => setPreviewTier(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Public Pricing Preview</DialogTitle>
        <DialogContent>
          {previewTier && (
            <Paper
              elevation={previewTier.highlight ? 8 : 2}
              sx={{
                p: 3,
                textAlign: "center",
                border: previewTier.highlight ? "2px solid" : "1px solid",
                borderColor: previewTier.highlight ? "primary.main" : "divider",
                borderRadius: 2,
                position: "relative",
                overflow: "visible",
              }}
            >
              {previewTier.highlight && (
                <Chip
                  label="Most Popular"
                  color="primary"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                />
              )}
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {previewTier.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {previewTier.description}
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="primary">
                $
                {previewTier.discountedPrice &&
                parseFloat(previewTier.discountedPrice) > 0
                  ? previewTier.discountedPrice
                  : previewTier.price}
                <Typography
                  component="span"
                  variant="body1"
                  color="text.secondary"
                >
                  /mo
                </Typography>
              </Typography>
              {previewTier.discountPercentage &&
                previewTier.discountPercentage > 0 && (
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ mt: 0.5 }}
                  >
                    Save {previewTier.discountPercentage}% on first year
                  </Typography>
                )}
              <Box sx={{ textAlign: "left", mt: 3 }}>
                {previewTier.features.map((feature, i) => (
                  <Box
                    key={i}
                    sx={{ display: "flex", alignItems: "center", mb: 1 }}
                  >
                    <CheckCircleIcon
                      color="primary"
                      sx={{ mr: 1, fontSize: 20 }}
                    />
                    <Typography variant="body2">{feature}</Typography>
                  </Box>
                ))}
              </Box>
              <Button
                variant={previewTier.highlight ? "contained" : "outlined"}
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
              >
                {previewTier.ctaText || "Get Started"}
              </Button>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewTier(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TierManagement;
