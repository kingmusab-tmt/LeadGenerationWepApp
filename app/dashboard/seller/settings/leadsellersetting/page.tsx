"use client";
import React, { useState, useEffect } from "react";
import {
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  Share as ShareIcon,
  EmojiEvents as QualityIcon,
  AttachMoney as MoneyIcon,
  Store as MarketplaceIcon,
  TrendingUp as VolumeIcon,
  CheckCircle,
} from "@mui/icons-material";
import axios from "@/lib/axiosInstance";
import { toast } from "react-toastify";

const LeadSettings = () => {
  // Lead distribution configuration state
  const [autoAssignLeads, setAutoAssignLeads] = useState<boolean>(false);
  const [distributionMode, setDistributionMode] = useState<
    "automatic" | "marketplace" | "both"
  >("marketplace");
  const [maxAutoAssignPerDay, setMaxAutoAssignPerDay] = useState<number>(50);
  const [aiQualityThreshold, setAiQualityThreshold] = useState<number>(50);
  const [marketplaceFallback, setMarketplaceFallback] = useState<boolean>(true);
  const [leadPricing, setLeadPricing] = useState<{
    high: number;
    medium: number;
    low: number;
  }>({ high: 10, medium: 5, low: 2 });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/settings");
        if (data?.success) {
          const s = data.data || {};
          setAutoAssignLeads(Boolean(s.autoAssignLeads));
          setDistributionMode(s.distributionMode || "marketplace");
          setMaxAutoAssignPerDay(s.maxAutoAssignPerDay ?? 50);
          setAiQualityThreshold(s.aiQualityThreshold ?? 50);
          setMarketplaceFallback(s.marketplaceFallback ?? true);
          if (s.leadPricing) {
            setLeadPricing({
              high: s.leadPricing.high ?? 10,
              medium: s.leadPricing.medium ?? 5,
              low: s.leadPricing.low ?? 2,
            });
          }
        }
      } catch (e) {
        // ignore load error for now
      }
    })();
  }, []);

  // Automatically update autoAssignLeads based on distributionMode
  useEffect(() => {
    if (distributionMode === "marketplace") {
      setAutoAssignLeads(false);
    } else if (
      distributionMode === "automatic" ||
      distributionMode === "both"
    ) {
      setAutoAssignLeads(true);
    }
  }, [distributionMode]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.post("/api/settings", {
        autoAssignLeads,
        distributionMode,
        maxAutoAssignPerDay,
        aiQualityThreshold,
        marketplaceFallback,
        leadPricing,
      });
      toast.success("Settings updated successfully");
      const now = new Date().toLocaleTimeString();
      setLastSaved(now);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      toast.error("Failed to update settings");
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: -2 }}>
      <Alert severity="info" icon={<ShareIcon />} sx={{ mb: 3 }}>
        Configure how leads are distributed to buyers - automatically assign to
        registered buyers or post to marketplace for manual purchase.
      </Alert>

      {/* LEAD DISTRIBUTION SECTION */}
      <Card
        elevation={0}
        sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <ShareIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="600">
                Lead Distribution Mode
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose how leads are distributed to buyers
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoAssignLeads}
                  onChange={(e) => setAutoAssignLeads(e.target.checked)}
                  disabled={distributionMode !== "marketplace"}
                />
              }
              label="Enable Auto-Assignment of Leads"
            />
            <Typography
              variant="caption"
              sx={{ display: "block", mt: -1, mb: 1, color: "text.secondary" }}
            >
              {distributionMode === "marketplace"
                ? "Automatically assign matching leads to buyers based on your preferences"
                : "Auto-assignment is controlled by Distribution Mode selection"}
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Distribution Mode</InputLabel>
              <Select
                value={distributionMode}
                label="Distribution Mode"
                onChange={(e) =>
                  setDistributionMode(e.target.value as typeof distributionMode)
                }
              >
                <MenuItem value="automatic">
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      Automatic Only
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Auto-assign all leads to buyers
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="marketplace">
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      Marketplace Only
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Post all leads to marketplace
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="both">
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      Both (by quality score)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      High quality auto-assigned, low quality to marketplace
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* LEAD PRICING BY QUALITY LEVEL */}
      <Card
        elevation={0}
        sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <MoneyIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="600">
                Lead Pricing by Quality
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set prices based on AI-detected quality scores
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Each lead will be priced according to its AI quality score,
              replacing any default flat pricing.
            </Typography>
          </Alert>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2.5,
            }}
          >
            <TextField
              label="🟢 High Quality"
              type="number"
              value={leadPricing.high}
              onChange={(e) =>
                setLeadPricing((prev) => ({
                  ...prev,
                  high: Math.max(0, parseInt(e.target.value || "0", 10)),
                }))
              }
              inputProps={{ min: 0 }}
              fullWidth
              helperText="Spam score 0–30"
            />
            <TextField
              label="🟡 Medium Quality"
              type="number"
              value={leadPricing.medium}
              onChange={(e) =>
                setLeadPricing((prev) => ({
                  ...prev,
                  medium: Math.max(0, parseInt(e.target.value || "0", 10)),
                }))
              }
              inputProps={{ min: 0 }}
              fullWidth
              helperText="Spam score 31–69"
            />
            <TextField
              label="🔴 Low Quality"
              type="number"
              value={leadPricing.low}
              onChange={(e) =>
                setLeadPricing((prev) => ({
                  ...prev,
                  low: Math.max(0, parseInt(e.target.value || "0", 10)),
                }))
              }
              inputProps={{ min: 0 }}
              fullWidth
              helperText="Spam score 70–100"
            />
          </Box>
        </CardContent>
      </Card>

      {/* MARKETPLACE FALLBACK */}
      <Card
        elevation={0}
        sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <MarketplaceIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="600">
                Marketplace Fallback
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Handle unassigned leads automatically
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <FormControlLabel
            control={
              <Switch
                checked={marketplaceFallback}
                onChange={(e) => setMarketplaceFallback(e.target.checked)}
              />
            }
            label="Post to Marketplace if Not Auto-Assigned"
          />
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: "text.secondary" }}
          >
            Leads that don't auto-assign will be available in the marketplace
            for manual purchase
          </Typography>
        </CardContent>
      </Card>

      {/* VOLUME & LIMITS SECTION */}
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <VolumeIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="600">
                Daily Volume Limits
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Control maximum leads per day
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <TextField
            label="Maximum Leads Per Day"
            type="number"
            value={maxAutoAssignPerDay}
            onChange={(e) =>
              setMaxAutoAssignPerDay(parseInt(e.target.value || "0", 10))
            }
            inputProps={{ min: 0 }}
            fullWidth
            helperText="Set to 0 for unlimited daily leads"
          />
        </CardContent>
        <Divider />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2.5,
            bgcolor: "grey.50",
          }}
        >
          {lastSaved && (
            <Chip
              icon={<CheckCircle />}
              label={`Saved at ${lastSaved}`}
              color="success"
              size="small"
              variant="outlined"
            />
          )}
          <Button
            variant="contained"
            size="large"
            onClick={handleSaveSettings}
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={20} color="inherit" />
              ) : undefined
            }
          >
            {saving ? "Saving..." : "Save All Settings"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default LeadSettings;
