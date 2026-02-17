"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useJsApiLoader } from "@react-google-maps/api";
import LocationOnIcon from "@mui/icons-material/LocationOn";

// Define libraries as a constant to prevent useJsApiLoader re-renders
const libraries: "places"[] = ["places"];

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GoogleCityAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectWithState?: (state: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  error?: boolean;
  errorText?: string;
  required?: boolean;
  onBlur?: () => void;
}

const GoogleCityAutocomplete: React.FC<GoogleCityAutocompleteProps> = ({
  label = "City",
  value,
  onChange,
  onSelectWithState,
  placeholder = "Search city...",
  helperText,
  disabled = false,
  error = false,
  errorText,
  required = false,
  onBlur,
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [options, setOptions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Initialize autocomplete service when loaded
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current =
        new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Fetch predictions from Google Places API
  const fetchPredictions = useCallback((input: string) => {
    if (!input || input.length < 2 || !autocompleteServiceRef.current) {
      setOptions([]);
      return;
    }

    setLoading(true);

    const request: google.maps.places.AutocompletionRequest = {
      input,
      componentRestrictions: { country: "us" },
      types: ["(cities)"],
    };

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (predictions, status) => {
        setLoading(false);

        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setOptions(predictions as PlacePrediction[]);
        } else {
          setOptions([]);
        }
      },
    );
  }, []);

  // Debounced search
  const handleInputChange = useCallback(
    (_: React.SyntheticEvent, newInputValue: string) => {
      setInputValue(newInputValue);

      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced search
      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(newInputValue);
      }, 300);
    },
    [fetchPredictions],
  );

  // State abbreviation to full name mapping
  const STATE_ABBREV_TO_NAME: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
  };

  // Handle selection
  const handleChange = useCallback(
    (_: React.SyntheticEvent, newValue: string | PlacePrediction | null) => {
      if (!newValue) {
        onChange("");
        if (onSelectWithState) {
          onSelectWithState("");
        }
        return;
      }

      if (typeof newValue === "string") {
        onChange(newValue);
      } else {
        // Extract city name, e.g., "Las Vegas"
        const cityName =
          newValue.structured_formatting?.main_text ||
          newValue.description.split(",")[0];
        onChange(cityName);

        // Extract state from secondary text (e.g., "Nevada, USA" or "NV, USA")
        if (
          onSelectWithState &&
          newValue.structured_formatting?.secondary_text
        ) {
          const secondaryText = newValue.structured_formatting.secondary_text;
          // Parse state from formats like "Nevada, USA" or "NV, USA"
          const parts = secondaryText.split(",").map((p) => p.trim());
          if (parts.length >= 1) {
            const stateOrAbbrev = parts[0];
            // Check if it's an abbreviation and convert to full name
            const fullStateName =
              STATE_ABBREV_TO_NAME[stateOrAbbrev] || stateOrAbbrev;
            onSelectWithState(fullStateName);
          }
        }
      }
    },
    [onChange, onSelectWithState],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Show error if Google Maps failed to load
  if (loadError) {
    return (
      <TextField
        label={label}
        disabled
        fullWidth
        error
        helperText="Failed to load Google Maps. Please check your API key."
        placeholder={placeholder}
      />
    );
  }

  // Show loading state while Google Maps is loading
  if (!isLoaded) {
    return (
      <TextField
        label={label}
        disabled
        fullWidth
        placeholder="Loading..."
        slotProps={{
          input: {
            endAdornment: <CircularProgress size={20} />,
          },
        }}
      />
    );
  }

  return (
    <Autocomplete
      freeSolo
      value={value || null}
      options={options}
      loading={loading}
      disabled={disabled}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      onBlur={onBlur}
      getOptionLabel={(option) => {
        if (typeof option === "string") return option;
        return option.structured_formatting?.main_text || option.description;
      }}
      filterOptions={(x) => x}
      isOptionEqualToValue={(option, val) => {
        const optionLabel =
          typeof option === "string"
            ? option
            : option.structured_formatting?.main_text || option.description;
        const valLabel =
          typeof val === "string"
            ? val
            : (val as PlacePrediction)?.structured_formatting?.main_text ||
              (val as PlacePrediction)?.description ||
              "";
        return optionLabel === valLabel;
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={value ? "" : placeholder}
          error={error}
          required={required}
          helperText={error ? errorText : helperText}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option, { index }) => {
        const { key, ...restProps } = props;
        const uniqueKey =
          typeof option === "string"
            ? `${option}-${index}`
            : option.place_id || `${option.description}-${index}`;
        return (
          <Box
            component="li"
            key={uniqueKey}
            {...restProps}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <LocationOnIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="body2">
                {typeof option === "string"
                  ? option
                  : option.structured_formatting?.main_text}
              </Typography>
              {typeof option !== "string" &&
                option.structured_formatting?.secondary_text && (
                  <Typography variant="caption" color="text.secondary">
                    {option.structured_formatting.secondary_text}
                  </Typography>
                )}
            </Box>
          </Box>
        );
      }}
      noOptionsText={
        inputValue.length < 2
          ? "Type at least 2 characters to search cities"
          : "No cities found"
      }
      slotProps={{
        listbox: {
          sx: {
            "&::after": {
              content: '"Powered by Google"',
              display: "block",
              fontSize: "10px",
              color: "text.secondary",
              textAlign: "right",
              padding: "4px 8px",
              borderTop: "1px solid",
              borderColor: "divider",
            },
          },
        },
      }}
    />
  );
};

export default GoogleCityAutocomplete;
