"use client";

import React, { useState } from "react";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import { timezones } from "@/utils/timezones";

interface TimezoneOption {
  value: string;
  label: string;
}

interface GoogleTimezoneAutocompleteProps {
  label: string;
  value: string; // Timezone string like "America/New_York"
  onChange: (timezone: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  error?: boolean;
  errorText?: string;
  required?: boolean;
}

const GoogleTimezoneAutocomplete: React.FC<GoogleTimezoneAutocompleteProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  disabled = false,
  error = false,
  errorText,
  required = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  // Find the selected timezone option
  const selectedOption = timezones.find((tz) => tz.value === value) || null;

  return (
    <Box>
      <Autocomplete
        fullWidth
        disabled={disabled}
        options={timezones}
        value={selectedOption}
        inputValue={inputValue}
        onInputChange={(_event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        onChange={(_event, newValue) => {
          if (newValue) {
            onChange(newValue.value);
          } else {
            onChange("");
          }
        }}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          return `${option.label} - ${option.value}`;
        }}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder || "Search for a timezone..."}
            helperText={
              errorText ||
              helperText ||
              (value ? `Selected: ${value}` : "Search and select a timezone")
            }
            error={error}
            required={required}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.value}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PublicIcon sx={{ color: "text.secondary", fontSize: 20 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {option.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.value}
                </Typography>
              </Box>
            </Box>
          </li>
        )}
      />
      {value && (
        <Typography
          variant="caption"
          color="primary"
          sx={{ mt: 0.5, display: "block" }}
        >
          Timezone ID: {value}
        </Typography>
      )}
    </Box>
  );
};

export default GoogleTimezoneAutocomplete;
