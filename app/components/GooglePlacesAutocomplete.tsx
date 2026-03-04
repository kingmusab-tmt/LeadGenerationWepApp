"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useJsApiLoader } from "@react-google-maps/api";
import LocationOnIcon from "@mui/icons-material/LocationOn";

// Define libraries as a constant to prevent useJsApiLoader re-renders
const libraries: "places"[] = ["places"];

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
  DC: "Washington DC",
};

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlacesAutocompleteProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  onSelectWithState?: (states: string[]) => void; // Callback to auto-populate states from cities
  onSelectWithZipCodes?: (zipCodes: string[]) => void; // Callback to auto-populate zip codes from cities
  placeholder?: string;
  helperText?: string;
  type: "city" | "state";
  disabled?: boolean;
  error?: boolean;
  errorText?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  label,
  value,
  onChange,
  onSelectWithState,
  onSelectWithZipCodes,
  placeholder,
  helperText,
  type,
  disabled = false,
  error = false,
  errorText,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null,
  );
  const placesServiceDivRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Initialize autocomplete service when loaded
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current =
        new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Initialize places service for fetching details (zip codes)
  useEffect(() => {
    if (isLoaded && !placesServiceRef.current) {
      // Create a hidden div for PlacesService (it requires a DOM element)
      if (!placesServiceDivRef.current) {
        const div = document.createElement("div");
        div.style.display = "none";
        document.body.appendChild(div);
        placesServiceDivRef.current = div;
      }
      placesServiceRef.current = new google.maps.places.PlacesService(
        placesServiceDivRef.current,
      );
    }
    // Cleanup on unmount
    return () => {
      if (
        placesServiceDivRef.current &&
        placesServiceDivRef.current.parentNode
      ) {
        placesServiceDivRef.current.parentNode.removeChild(
          placesServiceDivRef.current,
        );
      }
    };
  }, [isLoaded]);

  // Fetch zip codes for a place using PlacesService + Geocoding
  const fetchZipCodesForPlace = useCallback(
    (placeId: string): Promise<string[]> => {
      return new Promise((resolve) => {
        if (!placesServiceRef.current) {
          resolve([]);
          return;
        }

        // First, get the place details including geometry (location)
        placesServiceRef.current.getDetails(
          { placeId, fields: ["address_components", "geometry"] },
          (place, status) => {
            if (
              status !== google.maps.places.PlacesServiceStatus.OK ||
              !place
            ) {
              resolve([]);
              return;
            }

            // Check if postal_code is directly available (rare for cities)
            const directZipCodes: string[] = [];
            place.address_components?.forEach((component) => {
              if (component.types.includes("postal_code")) {
                directZipCodes.push(component.long_name);
              }
            });

            if (directZipCodes.length > 0) {
              resolve(directZipCodes);
              return;
            }

            // If no direct postal code and we have geometry, use Geocoder to reverse geocode
            if (place.geometry?.location) {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode(
                { location: place.geometry.location },
                (results, geocodeStatus) => {
                  if (
                    geocodeStatus === google.maps.GeocoderStatus.OK &&
                    results
                  ) {
                    const zipCodesFromGeocode = new Set<string>();

                    // Look through all results for postal codes
                    results.forEach((result) => {
                      result.address_components?.forEach((component) => {
                        if (component.types.includes("postal_code")) {
                          zipCodesFromGeocode.add(component.long_name);
                        }
                      });
                    });

                    resolve(Array.from(zipCodesFromGeocode));
                  } else {
                    resolve([]);
                  }
                },
              );
            } else {
              resolve([]);
            }
          },
        );
      });
    },
    [],
  );

  // Fetch predictions from Google Places API
  const fetchPredictions = useCallback(
    (input: string) => {
      if (!input || input.length < 2 || !autocompleteServiceRef.current) {
        setOptions([]);
        return;
      }

      setLoading(true);

      // Configure types based on what we're searching for
      const request: google.maps.places.AutocompletionRequest = {
        input,
        componentRestrictions: { country: "us" }, // Restrict to US
        types: type === "city" ? ["(cities)"] : ["administrative_area_level_1"],
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
    },
    [type],
  );

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

  // Handle selection
  const handleChange = useCallback(
    (_: React.SyntheticEvent, newValue: (string | PlacePrediction)[]) => {
      // Extract display names from selected options
      const selectedValues = newValue.map((item) => {
        if (typeof item === "string") {
          return item;
        }
        // For cities, extract just the city name (before the comma)
        if (type === "city") {
          return (
            item.structured_formatting?.main_text ||
            item.description.split(",")[0]
          );
        }
        // For states, use the main text
        return item.structured_formatting?.main_text || item.description;
      });

      // Extract states from city selections if callback provided
      if (type === "city" && onSelectWithState) {
        const extractedStates = new Set<string>();
        newValue.forEach((item) => {
          if (
            typeof item !== "string" &&
            item.structured_formatting?.secondary_text
          ) {
            // Secondary text is like "Nevada, United States" or "NV, USA"
            const parts = item.structured_formatting.secondary_text.split(",");
            if (parts.length > 0) {
              const stateOrAbbrev = parts[0].trim();
              // Check if it's an abbreviation and convert to full name
              const fullStateName =
                STATE_ABBREV_TO_NAME[stateOrAbbrev] || stateOrAbbrev;
              if (
                fullStateName &&
                fullStateName !== "United States" &&
                fullStateName !== "USA"
              ) {
                extractedStates.add(fullStateName);
              }
            }
          }
        });
        if (extractedStates.size > 0) {
          onSelectWithState(Array.from(extractedStates));
        }
      }

      // Extract zip codes from city selections if callback provided
      if (type === "city" && onSelectWithZipCodes) {
        const placeIds = newValue
          .filter((item): item is PlacePrediction => typeof item !== "string")
          .map((item) => item.place_id);

        if (placeIds.length > 0) {
          // Fetch zip codes for all selected places
          Promise.all(placeIds.map((id) => fetchZipCodesForPlace(id))).then(
            (zipCodeArrays) => {
              const allZipCodes = new Set<string>();
              zipCodeArrays.forEach((zips) => {
                zips.forEach((zip) => allZipCodes.add(zip));
              });
              if (allZipCodes.size > 0) {
                onSelectWithZipCodes(Array.from(allZipCodes));
              }
            },
          );
        }
      }

      onChange(selectedValues);
    },
    [
      onChange,
      onSelectWithState,
      onSelectWithZipCodes,
      type,
      fetchZipCodesForPlace,
    ],
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
        placeholder="Loading Google Maps..."
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
      multiple
      freeSolo
      value={value}
      options={options}
      loading={loading}
      disabled={disabled}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      getOptionLabel={(option) => {
        if (typeof option === "string") return option;
        return option.structured_formatting?.main_text || option.description;
      }}
      filterOptions={(x) => x} // Disable built-in filtering since Google handles it
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
          placeholder={value.length === 0 ? placeholder : ""}
          error={error}
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
        // Use place_id for unique key, fallback to index for string options
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
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...chipProps } = getTagProps({ index });
          const label =
            typeof option === "string"
              ? option
              : option.structured_formatting?.main_text || option.description;
          return (
            <Chip
              key={key}
              label={label}
              {...chipProps}
              size="small"
              variant="outlined"
            />
          );
        })
      }
      noOptionsText={
        inputValue.length < 2
          ? `Type at least 2 characters to search ${type === "city" ? "cities" : "states"}`
          : `No ${type === "city" ? "cities" : "states"} found`
      }
      ListboxProps={{
        sx: {
          "& .MuiAutocomplete-option:last-child": {
            borderTop: "1px solid",
            borderColor: "divider",
          },
        },
      }}
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

export default GooglePlacesAutocomplete;
