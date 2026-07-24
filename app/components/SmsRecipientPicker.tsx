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
import { useDashboardTerms } from "@/app/hooks";

interface PhoneRecipient {
  phone: string;
  name: string;
  company: string;
  type: "buyer" | "lead" | "manual";
}

interface SmsRecipientPickerProps {
  value: string; // comma-separated phone string
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function SmsRecipientPicker({
  value,
  onChange,
  disabled = false,
}: SmsRecipientPickerProps) {
  const terms = useDashboardTerms();
  const [recipientSource, setRecipientSource] = useState<string>("");
  const [availableBuyers, setAvailableBuyers] = useState<PhoneRecipient[]>([]);
  const [availableLeads, setAvailableLeads] = useState<PhoneRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [manualPhone, setManualPhone] = useState("");
  const [fetched, setFetched] = useState(false);

  // Parse current value into selected list on mount
  useEffect(() => {
    if (value) {
      const phones = value
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      setSelectedRecipients(phones);
    }
  }, []); // Only on mount

  // Fetch available recipients
  const fetchRecipients = useCallback(async () => {
    if (fetched) return;
    try {
      setLoadingRecipients(true);
      const response = await fetch("/api/marketing/sms/recipients?source=both");
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
    let phonesToAdd: string[] = [];
    if (source === "buyers") {
      phonesToAdd = availableBuyers.map((b) => b.phone);
    } else if (source === "leads") {
      phonesToAdd = availableLeads.map((l) => l.phone);
    } else if (source === "both") {
      phonesToAdd = [
        ...availableBuyers.map((b) => b.phone),
        ...availableLeads.map((l) => l.phone),
      ];
    }
    const merged = new Set([...selectedRecipients, ...phonesToAdd]);
    setSelectedRecipients(Array.from(merged));
    if (phonesToAdd.length > 0) {
      toast.success(`Added ${phonesToAdd.length} recipients from ${source}`);
    }
  };

  const handleToggleRecipient = (phone: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone],
    );
  };

  const handleAddManualPhone = () => {
    const phones = manualPhone
      .split(",")
      .map((p) => p.trim().replace(/[^+\d]/g, ""))
      .filter((p) => p.length >= 10);

    if (phones.length === 0) {
      toast.error("Please enter valid phone number(s) (10+ digits)");
      return;
    }

    const merged = new Set([...selectedRecipients, ...phones]);
    setSelectedRecipients(Array.from(merged));
    setManualPhone("");
    toast.success(`Added ${phones.length} phone number(s)`);
  };

  const handleRemoveRecipient = (phone: string) => {
    setSelectedRecipients((prev) => prev.filter((p) => p !== phone));
  };

  const handleClearAll = () => {
    setSelectedRecipients([]);
  };

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
            <MenuItem value="buyers">{terms.leadBuyers}</MenuItem>
            <MenuItem value="leads">Leads</MenuItem>
            <MenuItem value="both">Both ({terms.buyers} + Leads)</MenuItem>
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
              ? terms.buyers
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
                ? terms.leadBuyers.toLowerCase()
                : recipientSource === "leads"
                  ? "leads"
                  : "recipients"}{" "}
              found with phone numbers
            </Typography>
          ) : (
            getVisibleRecipients().map((r) => (
              <Box
                key={`${r.type}-${r.phone}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": { backgroundColor: "action.hover" },
                  cursor: disabled ? "default" : "pointer",
                }}
                onClick={() => !disabled && handleToggleRecipient(r.phone)}
              >
                <Checkbox
                  checked={selectedRecipients.includes(r.phone)}
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
                      {r.name || r.phone}
                      {r.company ? ` (${r.company})` : ""}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {r.phone} &middot;{" "}
                      {r.type === "buyer" ? terms.leadBuyer : "Lead"}
                    </Typography>
                  }
                />
              </Box>
            ))
          )}
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Manual Phone Entry */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Manual Entry
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          size="small"
          label="Enter phone number(s)"
          placeholder="+15551234567, +15559876543"
          value={manualPhone}
          onChange={(e) => setManualPhone(e.target.value)}
          fullWidth
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddManualPhone();
            }
          }}
          helperText="Comma-separated. Press Enter or click Add."
        />
        <Button
          variant="outlined"
          onClick={handleAddManualPhone}
          disabled={disabled || !manualPhone.trim()}
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
              Selected phone numbers will receive the SMS:
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
            {selectedRecipients.map((phone) => (
              <Chip
                key={phone}
                label={phone}
                size="small"
                onDelete={
                  disabled ? undefined : () => handleRemoveRecipient(phone)
                }
                color={
                  availableBuyers.some((b) => b.phone === phone)
                    ? "primary"
                    : availableLeads.some((l) => l.phone === phone)
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
