/**
 * US States and Locations Data
 * Used for location-based filtering and selection in buyer preferences
 */

/**
 * All US States with abbreviations
 */
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

/**
 * Extract state abbreviation from city string (e.g., "New York, NY" -> "NY")
 */
export const extractStateFromCity = (cityString: string): string | null => {
  const match = cityString.match(/,\s*([A-Z]{2})$/);
  return match ? match[1] : null;
};

/**
 * Extract city name from city string (e.g., "New York, NY" -> "New York")
 */
export const extractCityName = (cityString: string): string => {
  return cityString.split(",")[0].trim();
};

/**
 * Get state label from abbreviation
 */
export const getStateLabel = (abbreviation: string): string => {
  const state = US_STATES.find((s) => s.value === abbreviation);
  return state ? state.label : abbreviation;
};

/**
 * Get state abbreviation from label
 */
export const getStateAbbreviation = (label: string): string | null => {
  const state = US_STATES.find((s) => s.label === label);
  return state ? state.value : null;
};

/**
 * Get all unique states from cities list
 */
export const getStatesFromCities = (cities: string[]): string[] => {
  const states = new Set<string>();
  cities.forEach((city) => {
    const state = extractStateFromCity(city);
    if (state) states.add(state);
  });
  return Array.from(states).sort();
};

/**
 * Get cities for a specific state
 */
export const getCitiesByState = (state: string, cities: string[]): string[] => {
  return cities.filter((city) => extractStateFromCity(city) === state);
};
