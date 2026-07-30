"use client";

import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import UpgradeRoundedIcon from "@mui/icons-material/UpgradeRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import { useDashboardTerms } from "@/app/hooks";

interface SubscriptionExpiryModalProps {
  open: boolean;
  daysRemaining: number;
  expiryDate: string;
  planName?: string | null;
  isFreeTrial?: boolean;
  onRenewNow: () => void;
  onUpgradePlan: () => void;
  onClose: () => void;
}

const formatDate = (date: string) => {
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
};

export default function SubscriptionExpiryModal({
  open,
  daysRemaining,
  expiryDate,
  planName,
  isFreeTrial = false,
  onRenewNow,
  onUpgradePlan,
  onClose,
}: SubscriptionExpiryModalProps) {
  const terms = useDashboardTerms();
  const daysLabel = daysRemaining === 1 ? "day" : "days";
  const canRenewPlan = !isFreeTrial;
  const bodyCopy = isFreeTrial
    ? `Your 14-day free trial is ending soon. Upgrade now to avoid losing access to your ${terms.org.toLowerCase()} dashboard, lead tools, and automations.`
    : `Renew now to avoid losing access to your ${terms.org.toLowerCase()} dashboard, lead tools, and automations.`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="subscription-expiry-modal-title"
    >
      <DialogTitle id="subscription-expiry-modal-title">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <WarningAmberRoundedIcon color="warning" />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Subscription expiring soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Action required to keep {terms.org.toLowerCase()} tools active
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "warning.50",
              border: "1px solid",
              borderColor: "warning.200",
            }}
          >
            <Typography variant="h4" fontWeight={800} color="warning.main">
              {daysRemaining} {daysLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              left until your subscription expires on {formatDate(expiryDate)}.
            </Typography>
          </Box>

          <Typography variant="body1">
            {planName
              ? `${planName} is ending soon.`
              : "Your subscription is ending soon."}{" "}
            {bodyCopy}
          </Typography>

          {/* <Chip
            label="Shown once per day"
            size="small"
            color="warning"
            sx={{ alignSelf: "flex-start" }}
          /> */}

          <Divider />

          <Typography variant="body2" color="text.secondary">
            Choose the next step that fits your business best.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit">
          Maybe later
        </Button>
        <Button
          onClick={onUpgradePlan}
          variant="outlined"
          startIcon={<UpgradeRoundedIcon />}
        >
          Upgrade plan
        </Button>
        {canRenewPlan && (
          <Button
            onClick={onRenewNow}
            variant="contained"
            color="warning"
            startIcon={<AutorenewRoundedIcon />}
          >
            Renew plan now
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
