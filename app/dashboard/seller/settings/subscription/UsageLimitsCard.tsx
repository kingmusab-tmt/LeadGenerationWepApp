"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
  Chip,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

interface UsageItem {
  label: string;
  used: number;
  limit: number; // 0 means unlimited
  unit?: string;
}

interface FeatureItem {
  label: string;
  enabled: boolean;
}

interface UsageLimitsCardProps {
  usage?: {
    leads?: number;
    callSeconds?: number;
    forms?: number;
    buyers?: number;
    smsCampaigns?: number;
    invoices?: number;
  };
  limits?: {
    leads?: number;
    callSeconds?: number;
    forms?: number;
    buyers?: number;
    smsCampaignsPerMonth?: number;
    smsCampaignsEnabled?: boolean;
    invoicesPerMonth?: number;
    callRecording?: boolean;
    emailCampaignsEnabled?: boolean;
    callTranscription?: boolean;
    callAIAnalysis?: boolean;
    chatbotEnabled?: boolean;
    leadScoringEnabled?: boolean;
    zapierIntegration?: boolean;
    apiAccess?: boolean;
    exports?: boolean;
    imports?: boolean;
    aiGenerativeEnabled?: boolean;
    advancedReports?: boolean;
    liveSupport?: boolean;
    prioritySupport?: boolean;
  };
  loading?: boolean;
}

function UsageProgressBar({
  item,
  showWarning = true,
}: {
  item: UsageItem;
  showWarning?: boolean;
}) {
  const isUnlimited = item.limit === 0;
  const percentage = isUnlimited ? 0 : (item.used / item.limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const getColor = () => {
    if (isAtLimit) return "error";
    if (isNearLimit) return "warning";
    return "primary";
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={0.5}
      >
        <Typography variant="body2" color="textSecondary">
          {item.label}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {showWarning && isNearLimit && !isAtLimit && (
            <Tooltip title="Approaching limit">
              <WarningIcon color="warning" fontSize="small" />
            </Tooltip>
          )}
          {showWarning && isAtLimit && (
            <Tooltip title="Limit reached">
              <CancelIcon color="error" fontSize="small" />
            </Tooltip>
          )}
          <Typography variant="body2" fontWeight="medium">
            {item.used.toLocaleString()}
            {isUnlimited ? (
              <Typography component="span" color="textSecondary">
                {" "}
                / Unlimited
              </Typography>
            ) : (
              <Typography component="span" color="textSecondary">
                {" "}
                / {item.limit.toLocaleString()}
                {item.unit ? ` ${item.unit}` : ""}
              </Typography>
            )}
          </Typography>
        </Box>
      </Box>
      {!isUnlimited && (
        <LinearProgress
          variant="determinate"
          value={Math.min(percentage, 100)}
          color={getColor()}
          sx={{ height: 8, borderRadius: 4 }}
        />
      )}
    </Box>
  );
}

function FeatureChip({ feature }: { feature: FeatureItem }) {
  return (
    <Chip
      icon={feature.enabled ? <CheckIcon /> : <CancelIcon />}
      label={feature.label}
      size="small"
      color={feature.enabled ? "success" : "default"}
      variant={feature.enabled ? "filled" : "outlined"}
      sx={{ opacity: feature.enabled ? 1 : 0.6 }}
    />
  );
}

export default function UsageLimitsCard({
  usage,
  limits,
  loading = false,
}: UsageLimitsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Usage & Limits
          </Typography>
          <Box display="flex" justifyContent="center" py={3}>
            <Typography color="textSecondary">Loading...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!usage || !limits) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Usage & Limits
          </Typography>
          <Typography color="textSecondary">No usage data available</Typography>
        </CardContent>
      </Card>
    );
  }

  // Build usage items
  const usageItems: UsageItem[] = [
    {
      label: "Leads",
      used: usage.leads || 0,
      limit: limits.leads || 0,
    },
    {
      label: "Forms",
      used: usage.forms || 0,
      limit: limits.forms || 0,
    },
    {
      label: "Buyers",
      used: usage.buyers || 0,
      limit: limits.buyers || 0,
    },
    {
      label: "Call Minutes",
      used: Math.round((usage.callSeconds || 0) / 60),
      limit: limits.callSeconds ? Math.round(limits.callSeconds / 60) : 0,
      unit: "min",
    },
    {
      label: "SMS Campaigns",
      used: usage.smsCampaigns || 0,
      limit: limits.smsCampaignsEnabled ? limits.smsCampaignsPerMonth || 0 : 0,
    },
    {
      label: "Invoices",
      used: usage.invoices || 0,
      limit: limits.invoicesPerMonth || 0,
    },
  ].filter((item) => item.limit > 0 || item.used > 0);

  // Build feature items
  const features: FeatureItem[] = [
    { label: "Email Campaigns", enabled: !!limits.emailCampaignsEnabled },
    { label: "SMS Campaigns", enabled: !!limits.smsCampaignsEnabled },
    { label: "AI Generative", enabled: !!limits.aiGenerativeEnabled },
    { label: "Call Recording", enabled: !!limits.callRecording },
    { label: "Call Transcription", enabled: !!limits.callTranscription },
    { label: "AI Call Analysis", enabled: !!limits.callAIAnalysis },
    { label: "Chatbot", enabled: !!limits.chatbotEnabled },
    { label: "Lead Scoring", enabled: !!limits.leadScoringEnabled },
    { label: "Zapier Integration", enabled: !!limits.zapierIntegration },
    { label: "API Access", enabled: !!limits.apiAccess },
    { label: "Data Exports", enabled: !!limits.exports },
    { label: "Data Imports", enabled: !!limits.imports },
    { label: "Advanced Reports", enabled: !!limits.advancedReports },
    { label: "Live Support", enabled: !!limits.liveSupport },
    { label: "Priority Support", enabled: !!limits.prioritySupport },
  ];

  const enabledFeatures = features.filter((f) => f.enabled);
  const disabledFeatures = features.filter((f) => !f.enabled);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Usage & Limits
        </Typography>

        {usageItems.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              gutterBottom
              sx={{ mt: 2 }}
            >
              Current Usage
            </Typography>
            <Stack spacing={2}>
              {usageItems.map((item) => (
                <UsageProgressBar key={item.label} item={item} />
              ))}
            </Stack>
          </>
        )}

        {(enabledFeatures.length > 0 || disabledFeatures.length > 0) && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Features Included
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {enabledFeatures.map((feature) => (
                <FeatureChip key={feature.label} feature={feature} />
              ))}
            </Box>

            {disabledFeatures.length > 0 && (
              <>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                  sx={{ mt: 2 }}
                >
                  Not Included in Plan
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {disabledFeatures.slice(0, 5).map((feature) => (
                    <FeatureChip key={feature.label} feature={feature} />
                  ))}
                  {disabledFeatures.length > 5 && (
                    <Chip
                      label={`+${disabledFeatures.length - 5} more`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
