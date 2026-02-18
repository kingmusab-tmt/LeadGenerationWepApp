"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { toast } from "react-toastify";
import GoogleCityAutocomplete from "./GoogleCityAutocomplete";

interface TwilioNumberGeneratorProps {
  open: boolean;
  onClose: () => void;
  onNumberGenerated: (phoneNumber: string) => void;
  currentCount?: number;
  maxAllowed?: number;
}

export default function TwilioNumberGenerator({
  open,
  onClose,
  onNumberGenerated,
  currentCount = 0,
  maxAllowed = 0,
}: TwilioNumberGeneratorProps) {
  const [city, setCity] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const handleRequestNumber = async () => {
    if (maxAllowed > 0 && currentCount >= maxAllowed) {
      setLimitReached(true);
      toast.error(
        `You have reached your SMS phone number limit (${currentCount}/${maxAllowed})`,
      );
      return;
    }

    try {
      setLoading(true);
      const payload = {
        areaCode: areaCode || "", // Optional for SMS
        industry: "SMS",
        method: "Automatic",
        purpose: "sms",
      };

      const response = await fetch("/api/calls/twilio/register_number", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.limitReached) {
          setLimitReached(true);
        }
        throw new Error(errorData.message || "Failed to request number");
      }

      const data = await response.json();
      toast.success(
        `Number ${data.phoneNumber} generated successfully (${data.currentCount}/${data.maxAllowed} used)`,
      );

      // Call the callback with the new number
      onNumberGenerated(data.phoneNumber);

      // Reset form and close
      setCity("");
      setAreaCode("");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to request number",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Twilio Number for SMS</DialogTitle>
      <DialogContent
        sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {maxAllowed > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Phone Numbers Used
            </Typography>
            <Chip
              label={`${currentCount} / ${maxAllowed}`}
              color={currentCount >= maxAllowed ? "error" : "primary"}
              variant="outlined"
            />
          </Box>
        )}

        {limitReached && (
          <Alert severity="warning">
            You have reached your SMS phone number allocation. Contact support
            to increase your limit.
          </Alert>
        )}

        <GoogleCityAutocomplete
          label="City (Area Code) - Optional"
          value={city}
          onChange={(val) => setCity(val)}
          placeholder="Search city for specific area code (optional)..."
          helperText={
            areaCode
              ? `Area Code: ${areaCode}`
              : "Leave empty to get any available number"
          }
        />

        <Typography variant="body2" color="text.secondary">
          This Twilio number will count towards phone number allocation and can
          be used to send SMS campaigns to your leads, buyers and other manually
          entered numbers.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleRequestNumber}
          variant="contained"
          disabled={loading || (maxAllowed > 0 && currentCount >= maxAllowed)}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Generating..." : "Generate Number"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
