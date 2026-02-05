"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
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
  Paper,
  Divider,
} from "@mui/material";
import axios from "axios";
import { styled } from "@mui/system";
import { toast } from "react-toastify";
import { useCSRF } from "@/app/hooks";

const SettingsContainer = styled(Container)({
  marginTop: "20px",
  padding: "20px",
  backgroundColor: "#fff",
  borderRadius: "8px",
});

const Section = styled(Paper)({
  marginBottom: "24px",
  padding: "20px",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  backgroundColor: "#fafafa",
});

const SectionHeader = styled(Typography)({
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "#1976d2",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
});

const LeadSettings = () => {
  const { csrfToken } = useCSRF();
  // Lead distribution configuration state
  const [autoAssignLeads, setAutoAssignLeads] = useState<boolean>(false);
  const [distributionMode, setDistributionMode] = useState<
    "automatic" | "marketplace" | "both"
  >("marketplace");
  const [maxAutoAssignPerDay, setMaxAutoAssignPerDay] = useState<number>(50);
  const [aiQualityThreshold, setAiQualityThreshold] = useState<number>(50);
  const [marketplaceFallback, setMarketplaceFallback] = useState<boolean>(true);

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
    try {
      await axios.post(
        "/api/settings",
        {
          autoAssignLeads,
          distributionMode,
          maxAutoAssignPerDay,
          aiQualityThreshold,
          marketplaceFallback,
        },
        {
          headers: {
            "X-CSRF-Token": csrfToken || "",
          },
        },
      );
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  return (
    <SettingsContainer>
      {/* LEAD DISTRIBUTION SECTION */}
      <Section>
        <SectionHeader>📊 Lead Distribution</SectionHeader>
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
          sx={{ display: "block", mt: 1, mb: 2, color: "#666" }}
        >
          {distributionMode === "marketplace"
            ? "Automatically assign matching leads to buyers based on your preferences"
            : "Auto-assignment is controlled by Distribution Mode selection"}
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
          <Box>
            <FormControl fullWidth>
              <InputLabel>Distribution Mode</InputLabel>
              <Select
                value={distributionMode}
                label="Distribution Mode"
                onChange={(e) =>
                  setDistributionMode(e.target.value as typeof distributionMode)
                }
              >
                <MenuItem value="automatic">Automatic Only</MenuItem>
                <MenuItem value="marketplace">Marketplace Only</MenuItem>
                <MenuItem value="both">Both (by quality score)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Section>

      {/* AI QUALITY CONTROLS */}
      <Section>
        <SectionHeader>🤖 AI Quality Controls</SectionHeader>
        <Typography
          variant="caption"
          sx={{ display: "block", mb: 2, color: "#666" }}
        >
          Control lead quality using AI spam/quality scoring (lower is stricter)
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Box>
            <TextField
              label="AI Quality Threshold"
              type="number"
              value={aiQualityThreshold}
              onChange={(e) =>
                setAiQualityThreshold(parseInt(e.target.value || "50", 10))
              }
              inputProps={{ min: 0, max: 100 }}
              fullWidth
              helperText="Auto-assign only leads with AI score ≤ this threshold (0-100, lower is stricter)"
            />
          </Box>
        </Box>
      </Section>

      {/* MARKETPLACE FALLBACK */}
      <Section>
        <SectionHeader>🏪 Marketplace Fallback</SectionHeader>
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
          sx={{ display: "block", mt: 1, color: "#666" }}
        >
          Leads that don't auto-assign (no match, quality too low, or limit
          reached) will be available in the marketplace for manual purchase
        </Typography>
      </Section>

      {/* VOLUME & LIMITS SECTION */}
      <Section>
        <SectionHeader>📈 Volume & Daily Limits</SectionHeader>
        <Typography
          variant="caption"
          sx={{ display: "block", mb: 2, color: "#666" }}
        >
          Control how many leads you receive per day
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Box>
            <TextField
              label="Maximum Leads Per Day"
              type="number"
              value={maxAutoAssignPerDay}
              onChange={(e) =>
                setMaxAutoAssignPerDay(parseInt(e.target.value || "0", 10))
              }
              inputProps={{ min: 0 }}
              fullWidth
              helperText="Set to 0 for unlimited"
            />
          </Box>
        </Box>
      </Section>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <Button variant="outlined" color="inherit">
          Reset to Defaults
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveSettings}
        >
          Save All Settings
        </Button>
      </Box>
    </SettingsContainer>
  );
};

export default LeadSettings;
