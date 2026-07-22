import React from "react";
import {
  Box,
  Typography,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Buyer } from "@/types/buyer";

interface BuyerProfileProps {
  buyer: Buyer;
}

const BuyerProfile: React.FC<BuyerProfileProps> = ({ buyer }) => {
  // Helper function to format schedule
  const formatSchedule = (schedule: Buyer["weeklySchedule"]) => {
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
    <Box
      sx={{
        overflow: "hidden",
        "& .MuiTypography-root": { wordBreak: "break-word" },
      }}
    >
      {/* BASIC INFORMATION */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6" color="primary" gutterBottom>
            Basic Information
          </Typography>
          {(buyer.createdAt || buyer.updatedAt) && (
            <Typography variant="caption" color="text.secondary">
              {buyer.createdAt &&
                `Registered ${new Date(buyer.createdAt).toLocaleDateString()}`}
              {buyer.createdAt && buyer.updatedAt && " • "}
              {buyer.updatedAt &&
                `Last updated ${new Date(buyer.updatedAt).toLocaleDateString()}`}
            </Typography>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr 1fr",
            },
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {buyer.name}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Company
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {buyer.company || "Not specified"}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {buyer.email}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {buyer.phone || "Not specified"}
            </Typography>
          </Box>
          {buyer.businessWebsite && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                gridColumn: { sm: "span 2" },
                overflow: "hidden",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Website
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {buyer.businessWebsite}
              </Typography>
            </Box>
          )}
          {buyer.companyRegNo && (
            <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Company Reg No
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {buyer.companyRegNo}
              </Typography>
            </Box>
          )}
          {buyer.vatTaxRegNo && (
            <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                VAT/Tax Reg No
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {buyer.vatTaxRegNo}
              </Typography>
            </Box>
          )}
        </Box>
        {buyer.businessDescription && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: "action.hover",
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Business Description
            </Typography>
            <Typography variant="body2">{buyer.businessDescription}</Typography>
          </Box>
        )}
        {buyer.contactAddress &&
          (buyer.contactAddress.addressLine1 || buyer.contactAddress.city) && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Contact Address:
              </Typography>
              <Box sx={{ ml: 2 }}>
                {buyer.contactAddress.addressLine1 && (
                  <Typography variant="body2">
                    {buyer.contactAddress.addressLine1}
                  </Typography>
                )}
                {buyer.contactAddress.addressLine2 && (
                  <Typography variant="body2">
                    {buyer.contactAddress.addressLine2}
                  </Typography>
                )}
                {(buyer.contactAddress.city ||
                  buyer.contactAddress.postCode) && (
                  <Typography variant="body2">
                    {[buyer.contactAddress.city, buyer.contactAddress.postCode]
                      .filter(Boolean)
                      .join(", ")}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              sm: "1fr 1fr 1fr 1fr",
            },
            gap: 2,
          }}
        >
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Units Balance
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {buyer.walletUnit}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={buyer.status}
              color={buyer.status === "active" ? "success" : "default"}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Priority
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {buyer.priority ?? 5} / 10
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Active
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {buyer.isActive ? "Yes" : "No"}
            </Typography>
          </Box>
        </Box>
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
            <Typography>
              <strong>Lead Location(s):</strong>{" "}
              {Array.isArray(buyer.leadPreferences?.location)
                ? buyer.leadPreferences.location.join(", ") || "Not specified"
                : buyer.leadPreferences?.location || "Not specified"}
            </Typography>

            {/* Service Locations */}
            {buyer.serviceLocations && buyer.serviceLocations.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Service Locations
                </Typography>
                {buyer.serviceLocations.map((loc, index) => (
                  <Box
                    key={index}
                    sx={{
                      ml: 2,
                      mb: 1,
                      p: 1,
                      bgcolor: "action.hover",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2">
                      <strong>
                        {[loc.city, loc.state, loc.country]
                          .filter(Boolean)
                          .join(", ")}
                      </strong>
                    </Typography>
                    {loc.radius && (
                      <Typography variant="body2">
                        Radius: {loc.radius} miles
                      </Typography>
                    )}
                    {loc.zipCodes && loc.zipCodes.length > 0 && (
                      <Typography variant="body2">
                        Zip Codes: {loc.zipCodes.join(", ")}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {/* Preferred Zones */}
            {buyer.preferredZones && buyer.preferredZones.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="subtitle2"
                  color="success.main"
                  gutterBottom
                >
                  Preferred Zones
                </Typography>
                {buyer.preferredZones.map((zone, index) => (
                  <Box key={index} sx={{ ml: 2, mb: 1 }}>
                    {zone.city && (
                      <Typography variant="body2">
                        <strong>City:</strong> {zone.city}
                      </Typography>
                    )}
                    {zone.state && (
                      <Typography variant="body2">
                        <strong>State:</strong> {zone.state}
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
              <strong>Strict Location Matching:</strong>{" "}
              {buyer.locationMatchingStrict ? "Yes" : "No"}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* LEAD PREFERENCES */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Lead Preferences</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            {/* Industries */}
            {buyer.leadPreferences?.industries &&
              buyer.leadPreferences.industries.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography>
                    <strong>Industries:</strong>
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}
                  >
                    {buyer.leadPreferences.industries.map(
                      (industry: string, index: number) => (
                        <Chip
                          key={index}
                          label={industry}
                          color="secondary"
                          variant="outlined"
                          size="small"
                        />
                      ),
                    )}
                  </Box>
                </Box>
              )}

            {/* Industry-Service Pairs */}
            {buyer.leadPreferences?.industryServicePairs &&
              buyer.leadPreferences.industryServicePairs.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Industry & Service Pairs
                  </Typography>
                  {buyer.leadPreferences.industryServicePairs.map(
                    (pair, index) => (
                      <Box
                        key={index}
                        sx={{
                          ml: 2,
                          mb: 1,
                          p: 1,
                          bgcolor: "action.hover",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {pair.industry}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            flexWrap: "wrap",
                            mt: 0.5,
                          }}
                        >
                          {pair.services.map((service, sIdx) => (
                            <Chip
                              key={sIdx}
                              label={service}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                        </Box>
                      </Box>
                    ),
                  )}
                </Box>
              )}

            {/* Lead Types */}
            {buyer.leadTypes && buyer.leadTypes.length > 0 && (
              <Box sx={{ mb: 2 }}>
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

            <Tooltip
              title={
                <>
                  Minimum quality threshold for auto-assignment:
                  <br />
                  • 100: Only High Quality (0-40 spam score)
                  <br />
                  • 60: High + Medium Quality (0-69 spam score)
                  <br />• 30 or less: Accept any quality level
                </>
              }
            >
              <Typography>
                <strong>Min Qualification Score:</strong>{" "}
                {buyer.qualificationScoreMinimum ?? 0}
              </Typography>
            </Tooltip>
            <Typography>
              <strong>Max Credits Per Lead:</strong>{" "}
              {buyer.maxPricePerLead ?? 0} credits
            </Typography>
            <Typography>
              <strong>Accept Call Leads:</strong>{" "}
              {buyer.acceptCallLeads ? "Yes" : "No"}
            </Typography>

            <Typography sx={{ mt: 2 }} variant="subtitle2" color="primary">
              Lead Freshness & Contact
            </Typography>
            <Typography>
              <strong>Max Lead Age:</strong> {buyer.maxLeadAge ?? 24} hours
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

            {/* Preference Matching Threshold */}
            <Typography sx={{ mt: 1 }}>
              <strong>Matching Threshold:</strong>{" "}
              {buyer.preferenceMatchingThreshold || "moderate"}
            </Typography>
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
              <strong>Working Hours:</strong>{" "}
              {buyer.workingHours?.start && buyer.workingHours?.end
                ? `${buyer.workingHours.start} - ${buyer.workingHours.end}`
                : "Not specified"}
            </Typography>
            <Typography>
              <strong>Accept Only During Business Hours:</strong>{" "}
              {buyer.acceptOnlyDuringBusinessHours ? "Yes" : "No"}
            </Typography>
            <Typography>
              <strong>Notify On Weekends:</strong>{" "}
              {buyer.notifyOnWeekends ? "Yes" : "No"}
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
                  Vacation Mode Active
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
              <strong>Budget Cap Type:</strong> {buyer.budgetCapType || "daily"}
            </Typography>
            <Typography>
              <strong>Budget Limit:</strong> {buyer.budgetLimitAmount ?? 0}{" "}
              credits per {buyer.budgetCapType || "day"}
            </Typography>
            <Typography>
              <strong>Volume Limit:</strong> {buyer.volumeLimitCount ?? 0} leads
              per {buyer.budgetCapType || "day"}
            </Typography>
            <Typography>
              <strong>Max Concurrent Leads:</strong>{" "}
              {buyer.maxConcurrentLeads ?? 10}
            </Typography>
            <Typography>
              <strong>Max Leads Per Day:</strong> {buyer.maxLeadsPerDay ?? 10}
            </Typography>

            <Typography sx={{ mt: 2 }} variant="subtitle2" color="primary">
              Current Period Usage
            </Typography>
            <Typography>
              <strong>Current Period Spent:</strong>{" "}
              {buyer.currentPeriodSpent ?? 0} credits
            </Typography>
            <Typography>
              <strong>Current Period Count:</strong>{" "}
              {buyer.currentPeriodCount ?? 0} leads
            </Typography>
            <Typography>
              <strong>Current Active Leads:</strong> {buyer.currentLeads ?? 0}
            </Typography>
            <Typography>
              <strong>Today&apos;s Leads:</strong>{" "}
              {buyer.currentLeadsToday ?? 0}
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
              {buyer.preferredDistribution || "Manual"}
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

            {/* Active Criteria Set */}
            {buyer.criteriaSets && buyer.criteriaSets.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Criteria Sets ({buyer.criteriaSets.length})
                </Typography>
                {buyer.criteriaSets.map((cs, index) => (
                  <Box
                    key={index}
                    sx={{
                      ml: 2,
                      mb: 1,
                      p: 1,
                      bgcolor:
                        buyer.activeCriteriaSetId === cs._id
                          ? "success.light"
                          : "action.hover",
                      borderRadius: 1,
                      border:
                        buyer.activeCriteriaSetId === cs._id
                          ? "1px solid"
                          : "none",
                      borderColor: "success.main",
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {cs.name}{" "}
                      {buyer.activeCriteriaSetId === cs._id && "(Active)"}{" "}
                      {cs.isDefault && "(Default)"}
                    </Typography>
                    <Typography variant="body2">
                      Lead Types: {cs.leadTypes?.join(", ") || "Any"} | Max
                      Price: {cs.maxPrice} | Daily Limit: {cs.dailyLimit} |
                      Auto-Accept: {cs.autoAccept ? "Yes" : "No"}
                    </Typography>
                    {cs.industries && cs.industries.length > 0 && (
                      <Typography variant="body2">
                        Industries: {cs.industries.join(", ")}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* PRIORITY WEIGHTS */}
      {((buyer.priorityBySource && buyer.priorityBySource.length > 0) ||
        (buyer.priorityByIndustry && buyer.priorityByIndustry.length > 0) ||
        (buyer.priorityByLocation && buyer.priorityByLocation.length > 0)) && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Priority Weights</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {buyer.priorityBySource && buyer.priorityBySource.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    By Source:
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", ml: 2 }}
                  >
                    {buyer.priorityBySource.map((item, index) => (
                      <Chip
                        key={index}
                        label={`${item.source}: ${item.priority}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
              {buyer.priorityByIndustry &&
                buyer.priorityByIndustry.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      By Industry:
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, flexWrap: "wrap", ml: 2 }}
                    >
                      {buyer.priorityByIndustry.map((item, index) => (
                        <Chip
                          key={index}
                          label={`${item.industry}: ${item.priority}`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              {buyer.priorityByLocation &&
                buyer.priorityByLocation.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      By Location:
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, flexWrap: "wrap", ml: 2 }}
                    >
                      {buyer.priorityByLocation.map((item, index) => (
                        <Chip
                          key={index}
                          label={`${item.location}: ${item.priority}`}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default BuyerProfile;
