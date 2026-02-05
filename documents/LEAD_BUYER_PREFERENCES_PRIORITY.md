# Lead Buyer Preferences (Priority Order)

Grouped by how early they are evaluated during lead-to-buyer matching.

## Most Important (Hard Filters — checked first)

1. Vacation mode (auto-reject during vacation window)
2. Qualification score minimum (lead quality score threshold)
3. Buyer active/suspended status
4. Daily lead limit (maxLeadsPerDay)
5. Max concurrent leads (maxConcurrentLeads)
6. Period-based volume limit (volumeLimitCount)
7. Period-based budget limit (budgetLimitAmount vs currentPeriodSpent + maxPricePerLead)

## Medium Priority (Eligibility Filters — core fit)

8. Preferred industries (leadPreferences.industries)
9. Strict location matching (locationMatchingStrict + serviceLocations)
10. Restricted zones (restrictedZones)
11. Excluded sources (excludedSources)
12. Wallet balance check (walletBalance vs maxPricePerLead)

## Low Priority (Timing & Notification Constraints)

14. Business-hours acceptance (acceptOnlyDuringBusinessHours + workingHours)
15. Weekend acceptance (notifyOnWeekends)

## Additional Buyer Preferences (Not part of matching order)

- Preferred distribution method (preferredDistribution)
- Auto-accept matching leads (autoAcceptMatchingLeads)
- Automatically accept call leads (acceptCallLeads)
- Notification channels (notificationPreferences)
- Lead types (leadTypes)
- Max price per lead (maxPricePerLead)
- Lead age limit (maxLeadAge)
- Service radius (serviceRadius)
- Preferred contact methods (preferredContactMethods)
- Duplicate blocking rules (blockDuplicateLeads, duplicateCheckWindow)
- Lead feedback settings (enableLeadFeedback)
- Priority weighting (priorityBySource, priorityByIndustry, priorityByLocation)
- Preferred zones (preferredZones)
- Radius flexibility (radiusFlexibility)
- Preference matching threshold (preferenceMatchingThreshold)
- Webhook configuration (webhookConfig)
- Weekly schedule (weeklySchedule)
