"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Checkbox,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Group as BuyerIcon,
  Person as LeadIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

interface Recipient {
  email: string;
  name: string;
  company: string;
  type: "buyer" | "lead" | "manual";
}

interface RecipientPickerProps {
  value: string; // comma-separated email string
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function RecipientPicker({
  value,
  onChange,
  disabled = false,
}: RecipientPickerProps) {
  const [recipientSource, setRecipientSource] = useState<string>("");
  const [availableBuyers, setAvailableBuyers] = useState<Recipient[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [fetched, setFetched] = useState(false);

  // Parse current value into selected list on mount
  useEffect(() => {
    if (value) {
      const emails = value
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      setSelectedRecipients(emails);
    }
  }, []); // Only on mount

  // Fetch available recipients when source changes
  const fetchRecipients = useCallback(async () => {
    if (fetched) return; // Already fetched
    try {
      setLoadingRecipients(true);
      const response = await fetch(
        "/api/marketing/email/recipients?source=both",
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAvailableBuyers(data.buyers || []);
      setAvailableLeads(data.leads || []);
      setFetched(true);
    } catch {
      toast.error("Failed to load recipients");
    } finally {
      setLoadingRecipients(false);
    }
  }, [fetched]);

  // Update parent when selectedRecipients change (but not on initial mount)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    onChange(selectedRecipients.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecipients]);

  const handleSourceChange = (source: string) => {
    setRecipientSource(source);
    if (!fetched) {
      fetchRecipients();
    }
  };

  const addRecipientsBySource = (source: string) => {
    let emailsToAdd: string[] = [];
    if (source === "buyers") {
      emailsToAdd = availableBuyers.map((b) => b.email);
    } else if (source === "leads") {
      emailsToAdd = availableLeads.map((l) => l.email);
    } else if (source === "both") {
      emailsToAdd = [
        ...availableBuyers.map((b) => b.email),
        ...availableLeads.map((l) => l.email),
      ];
    }
    // Merge with existing, deduplicate
    const merged = new Set([...selectedRecipients, ...emailsToAdd]);
    setSelectedRecipients(Array.from(merged));
    if (emailsToAdd.length > 0) {
      toast.success(`Added ${emailsToAdd.length} recipients from ${source}`);
    }
  };

  const handleToggleRecipient = (email: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  };

  const handleAddManualEmail = () => {
    const emails = manualEmail
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) {
      toast.error("Please enter valid email address(es)");
      return;
    }

    const merged = new Set([...selectedRecipients, ...emails]);
    setSelectedRecipients(Array.from(merged));
    setManualEmail("");
    toast.success(`Added ${emails.length} email(s)`);
  };

  const handleRemoveRecipient = (email: string) => {
    setSelectedRecipients((prev) => prev.filter((e) => e !== email));
  };

  const handleClearAll = () => {
    setSelectedRecipients([]);
  };

  // Get display list based on current source filter
  const getVisibleRecipients = () => {
    if (recipientSource === "buyers") return availableBuyers;
    if (recipientSource === "leads") return availableLeads;
    if (recipientSource === "both")
      return [...availableBuyers, ...availableLeads];
    return [];
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        Recipients ({selectedRecipients.length} selected)
      </Typography>

      {/* Source Selector + Add All Button */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Add From</InputLabel>
          <Select
            value={recipientSource}
            onChange={(e) => handleSourceChange(e.target.value)}
            label="Add From"
            disabled={disabled}
          >
            <MenuItem value="buyers">Lead Buyers</MenuItem>
            <MenuItem value="leads">Leads</MenuItem>
            <MenuItem value="both">Both (Buyers + Leads)</MenuItem>
          </Select>
        </FormControl>

        {recipientSource && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => addRecipientsBySource(recipientSource)}
            disabled={disabled || loadingRecipients}
            startIcon={<AddIcon />}
          >
            Add All{" "}
            {recipientSource === "buyers"
              ? "Buyers"
              : recipientSource === "leads"
                ? "Leads"
                : ""}
          </Button>
        )}

        {loadingRecipients && <CircularProgress size={20} />}
      </Box>

      {/* Individual Recipients List from Source */}
      {recipientSource && fetched && (
        <Box
          sx={{
            maxHeight: 200,
            overflow: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            mb: 2,
          }}
        >
          {getVisibleRecipients().length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 2, textAlign: "center" }}
            >
              No{" "}
              {recipientSource === "buyers"
                ? "lead buyers"
                : recipientSource === "leads"
                  ? "leads"
                  : "recipients"}{" "}
              found with email addresses
            </Typography>
          ) : (
            getVisibleRecipients().map((r) => (
              <Box
                key={`${r.type}-${r.email}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": { backgroundColor: "action.hover" },
                  cursor: disabled ? "default" : "pointer",
                }}
                onClick={() => !disabled && handleToggleRecipient(r.email)}
              >
                <Checkbox
                  checked={selectedRecipients.includes(r.email)}
                  size="small"
                  disabled={disabled}
                  sx={{ p: 0.5 }}
                />
                {r.type === "buyer" ? (
                  <BuyerIcon
                    fontSize="small"
                    color="primary"
                    sx={{ mx: 0.5 }}
                  />
                ) : (
                  <LeadIcon
                    fontSize="small"
                    color="secondary"
                    sx={{ mx: 0.5 }}
                  />
                )}
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {r.name || r.email}
                      {r.company ? ` (${r.company})` : ""}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {r.email} &middot;{" "}
                      {r.type === "buyer" ? "Lead Buyer" : "Lead"}
                    </Typography>
                  }
                />
              </Box>
            ))
          )}
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Manual Email Entry */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Manual Entry
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          size="small"
          label="Enter email(s)"
          placeholder="email@example.com, another@example.com"
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          fullWidth
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddManualEmail();
            }
          }}
          helperText="Comma-separated. Press Enter or click Add."
        />
        <Button
          variant="outlined"
          onClick={handleAddManualEmail}
          disabled={disabled || !manualEmail.trim()}
          sx={{ minWidth: 80, alignSelf: "flex-start", mt: "4px" }}
        >
          Add
        </Button>
      </Box>

      {/* Selected Recipients Chips */}
      {selectedRecipients.length > 0 && (
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Selected emails will receive the campaign:
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={handleClearAll}
              disabled={disabled}
            >
              Clear All
            </Button>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            {selectedRecipients.map((email) => (
              <Chip
                key={email}
                label={email}
                size="small"
                onDelete={
                  disabled ? undefined : () => handleRemoveRecipient(email)
                }
                color={
                  availableBuyers.some((b) => b.email === email)
                    ? "primary"
                    : availableLeads.some((l) => l.email === email)
                      ? "secondary"
                      : "default"
                }
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
