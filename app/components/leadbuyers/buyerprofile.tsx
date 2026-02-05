import React from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Buyer } from "@/types/buyer";

interface BuyerProfileProps {
  buyer: Buyer;
}

const BuyerProfile: React.FC<BuyerProfileProps> = ({ buyer }) => {
  // Helper function to format schedule
  const formatSchedule = (schedule: any) => {
    if (!schedule) return "Not configured";
    const days = Object.keys(schedule);
    const activeDays = days.filter((day) => schedule[day]?.enabled);
    if (activeDays.length === 0) return "No active days";
    return activeDays
      .map((day) => {
        const { start, end } = schedule[day];
        return `${day}: ${start}-${end}`;
      })
      .join(", ");
  };

  return (
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Buyer Profile
      </Typography>

      {/* BASIC INFORMATION */}
      <Box sx={{ marginTop: 2, marginBottom: 2 }}>
        <Typography variant="h6" color="primary" gutterBottom>
          Basic Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography>
          <strong>Name:</strong> {buyer.name}
        </Typography>
        <Typography>
          <strong>Company:</strong> {buyer.company}
        </Typography>
        <Typography>
          <strong>Email:</strong> {buyer.email}
        </Typography>
        <Typography>
          <strong>Phone:</strong> {buyer.phone}
        </Typography>
        <Typography>
          <strong>Units Balance:</strong> {buyer.walletUnit}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography>
            <strong>Status:</strong>
          </Typography>
          <Chip
            label={buyer.status}
            color={buyer.status === "active" ? "success" : "default"}
            size="small"
          />
        </Box>
        <Typography>
          <strong>Priority Level:</strong> {buyer.priorityLevel || "Standard"}
        </Typography>
      </Box>

      {/* LOCATION PREFERENCES */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Location Preferences</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography>
              <strong>Timezone:</strong> {buyer.timezone || "Not specified"}
            </Typography>

            {/* Restricted Locations */}
            {buyer.restrictedZones && buyer.restrictedZones.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  ❌ Restricted Locations (Excluded)
                </Typography>
                {buyer.restrictedZones.map((zone: any, index: number) => (
                  <Box key={index} sx={{ ml: 2, mb: 1 }}>
                    {zone.city && (
                      <Typography variant="body2">
                        <strong>Cities:</strong> {zone.city}
                      </Typography>
                    )}
                    {zone.state && (
                      <Typography variant="body2">
                        <strong>States:</strong> {zone.state}
                      </Typography>
                    )}
                    {zone.zipCodes && zone.zipCodes.length > 0 && (
                      <Typography variant="body2">
                        <strong>Zip Codes:</strong> {zone.zipCodes.join(", ")}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {/* Preferred Locations */}
            {buyer.preferredZones && buyer.preferredZones.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="subtitle2"
                  color="success.main"
                  gutterBottom
                >
                  ✅ Preferred Locations (Only Accept These)
                </Typography>
                {buyer.preferredZones.map((zone: any, index: number) => (
                  <Box key={index} sx={{ ml: 2, mb: 1 }}>
                    {zone.city && (
                      <Typography variant="body2">
                        <strong>Cities:</strong> {zone.city}
                      </Typography>
                    )}
                    {zone.state && (
                      <Typography variant="body2">
                        <strong>States:</strong> {zone.state}
                      </Typography>
                    )}
                    {zone.zipCodes && zone.zipCodes.length > 0 && (
                      <Typography variant="body2">
                        <strong>Zip Codes:</strong> {zone.zipCodes.join(", ")}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            <Typography sx={{ mt: 1 }}>
              <strong>Strict Matching:</strong>{" "}
              {buyer.locationMatchingStrict ? "Yes" : "No"}
            </Typography>
            <Typography>
              <strong>Flexibility:</strong>{" "}
              {buyer.radiusFlexibility || "Not specified"}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* LEAD PREFERENCES */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Lead Preferences</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography>
              <strong>Location:</strong>{" "}
              {buyer.leadPreferences?.location || "Not specified"}
            </Typography>
            <Typography>
              <strong>Industry:</strong>{" "}
              {buyer.leadPreferences?.industry || "Not specified"}
            </Typography>

            {/* Lead Types */}
            {buyer.leadTypes && buyer.leadTypes.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography>
                  <strong>Lead Types:</strong>
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  {buyer.leadTypes.map((type, index) => (
                    <Chip
                      key={index}
                      label={type}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Industries */}
            {buyer.industries && buyer.industries.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography>
                  <strong>Industries:</strong>
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  {buyer.industries.map((industry: any, index: number) => (
                    <Chip
                      key={index}
                      label={industry}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Typography sx={{ mt: 1 }}>
              <strong>Min Quality Score:</strong>{" "}
              {buyer.minQualityScore || "Not specified"}
            </Typography>
            <Typography>
              <strong>Max Credits Per Lead:</strong>{" "}
              {buyer.maxPricePerLead || "Not specified"} credits
            </Typography>
            <Typography>
              <strong>Preferred Credits:</strong>{" "}
              {buyer.preferredPrice || "Not specified"} credits
            </Typography>

            <Typography sx={{ mt: 2 }} variant="subtitle2" color="primary">
              Lead Freshness & Contact
            </Typography>
            <Typography>
              <strong>Max Lead Age:</strong> {buyer.maxLeadAge || 24} hours
            </Typography>
            <Typography>
              <strong>Service Radius:</strong> {buyer.serviceRadius || 25} miles
            </Typography>
            {buyer.preferredContactMethods &&
              buyer.preferredContactMethods.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography>
                    <strong>Preferred Contact Methods:</strong>
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}
                  >
                    {buyer.preferredContactMethods.map((method, index) => (
                      <Chip
                        key={index}
                        label={method.toUpperCase()}
                        color="info"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

            {/* OPERATIONAL AVAILABILITY */}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* OPERATIONAL AVAILABILITY */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Operational Availability</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography>
              <strong>Operating Hours:</strong>{" "}
              {buyer.operatingHours?.start && buyer.operatingHours?.end
                ? `${buyer.operatingHours.start} - ${buyer.operatingHours.end}`
                : "Not specified"}
            </Typography>

            {/* Weekly Schedule */}
            {buyer.weeklySchedule && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Weekly Schedule:
                </Typography>
                <Typography variant="body2" sx={{ ml: 2 }}>
                  {formatSchedule(buyer.weeklySchedule)}
                </Typography>
              </Box>
            )}

            {/* Vacation Mode */}
            {buyer.vacationMode?.enabled && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "warning.light",
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2" color="warning.dark">
                  🏖️ Vacation Mode Active
                </Typography>
                <Typography variant="body2">
                  Paused until:{" "}
                  {buyer.vacationMode.pauseUntil
                    ? new Date(
                        buyer.vacationMode.pauseUntil,
                      ).toLocaleDateString()
                    : "No end date"}
                </Typography>
                <Typography variant="body2">
                  Auto-reject leads:{" "}
                  {buyer.vacationMode.autoReject ? "Yes" : "No"}
                </Typography>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* BUDGET & VOLUME LIMITS */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Budget & Volume Limits</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography>
              <strong>Budget Cap Type:</strong>{" "}
              {buyer.budgetCapType || "Not specified"}
            </Typography>
            <Typography>
              <strong>Budget Cap Amount:</strong>{" "}
              {buyer.budgetCapAmount || "Not specified"} credits
            </Typography>
            <Typography>
              <strong>Max Concurrent Leads:</strong>{" "}
              {buyer.maxConcurrentLeads || "Not specified"}
            </Typography>
            <Typography>
              <strong>Max Leads Per Day:</strong>{" "}
              {buyer.maxLeadsPerDay || "Not specified"}
            </Typography>
            <Typography>
              <strong>Max Leads Per Week:</strong>{" "}
              {buyer.maxLeadsPerWeek || "Not specified"}
            </Typography>
            <Typography>
              <strong>Max Leads Per Month:</strong>{" "}
              {buyer.maxLeadsPerMonth || "Not specified"}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* DISTRIBUTION & NOTIFICATIONS */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Distribution & Notifications</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography>
              <strong>Preferred Distribution:</strong>{" "}
              {buyer.preferredDistribution || "Not specified"}
            </Typography>
            <Typography>
              <strong>Auto-Accept Matching Leads:</strong>{" "}
              {buyer.autoAcceptMatchingLeads ? "Yes" : "No"}
            </Typography>

            {/* Notification Preferences */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Notification Preferences:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {(buyer.notificationPreferences || []).length > 0 ? (
                  buyer.notificationPreferences.map((pref, index) => (
                    <Chip
                      key={index}
                      label={pref}
                      color="info"
                      variant="outlined"
                      size="small"
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No preferences set
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default BuyerProfile;
