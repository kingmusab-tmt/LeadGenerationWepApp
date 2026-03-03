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
  Typography,
  Chip,
  useTheme,
  Grid,
  useMediaQuery,
} from "@mui/material";
import { formatCurrency, formatDate } from "@/utils/formater";

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  previousBalance: number;
  currentBalance: number;
  status: string;
  createdAt: string;
  currency?: string;
  paymentGateway?: string;
  gatewayTransactionId?: string;
  metadata: {
    leadId?: string;
    unitsPurchased?: number;
    sellerId?: string;
    sellerName?: string;
    sellerEmail?: string;
    buyerId?: string;
    buyerName?: string;
    buyerEmail?: string;
    refund?: boolean;
    refunded?: boolean;
    refundedAt?: string;
    refundAmount?: number;
    isPartialRefund?: boolean;
    payoutId?: string;
    refundReason?: string;
    adminNote?: string;
    subscriptionId?: string;
    subscriptionPlan?: string;
    subscriptionDuration?: string;
    checkoutSessionId?: string;
    sellerAccountId?: string;
    creditsApplied?: boolean;
    transferVerified?: boolean;
    transferAmount?: number;
  };
}

interface TransactionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  open,
  onClose,
  transaction,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!transaction) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "refunded":
        return "warning";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "lead_purchase":
        return "Lead Purchase";
      case "units_purchase":
        return "Units Purchase";
      case "refund":
        return "Refund";
      case "admin_adjustment":
        return "Admin Adjustment";
      case "call_purchase":
        return "Call Purchase";
      default:
        return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const renderMetadata = () => {
    const { metadata } = transaction;

    if (!metadata) return null;

    return (
      <>
        <Typography variant="h6" gutterBottom>
          Additional Details
        </Typography>
        <Grid container spacing={2}>
          {/* Units Purchased */}
          {metadata.unitsPurchased !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Units Purchased
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {metadata.unitsPurchased} units
              </Typography>
            </Grid>
          )}

          {/* Lead ID */}
          {metadata.leadId && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Lead ID
              </Typography>
              <Typography
                variant="body2"
                sx={{ wordBreak: "break-all", fontFamily: "monospace" }}
              >
                {metadata.leadId}
              </Typography>
            </Grid>
          )}

          {/* Seller Name */}
          {metadata.sellerName && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Seller Name
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {metadata.sellerName}
              </Typography>
            </Grid>
          )}

          {/* Seller Email */}
          {metadata.sellerEmail && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Seller Email
              </Typography>
              <Typography variant="body2">{metadata.sellerEmail}</Typography>
            </Grid>
          )}

          {/* Seller ID (for reference) */}
          {metadata.sellerId && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Seller ID
              </Typography>
              <Typography
                variant="body2"
                sx={{ wordBreak: "break-all", fontFamily: "monospace" }}
              >
                {metadata.sellerId}
              </Typography>
            </Grid>
          )}

          {/* Credits Applied */}
          {metadata.creditsApplied !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Credits Applied
              </Typography>
              <Chip
                size="small"
                label={metadata.creditsApplied ? "Yes" : "No"}
                color={metadata.creditsApplied ? "success" : "default"}
              />
            </Grid>
          )}

          {/* Transfer Verified */}
          {metadata.transferVerified !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Transfer Verified
              </Typography>
              <Chip
                size="small"
                label={metadata.transferVerified ? "Verified" : "Pending"}
                color={metadata.transferVerified ? "success" : "warning"}
              />
            </Grid>
          )}

          {/* Transfer Amount */}
          {metadata.transferAmount !== undefined &&
            metadata.transferAmount > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Transfer Amount
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(metadata.transferAmount)}
                </Typography>
              </Grid>
            )}

          {/* Subscription Plan */}
          {metadata.subscriptionPlan && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Subscription Plan
              </Typography>
              <Typography variant="body2">
                {metadata.subscriptionPlan}
              </Typography>
            </Grid>
          )}

          {/* Subscription Duration */}
          {metadata.subscriptionDuration && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Subscription Duration
              </Typography>
              <Typography variant="body2">
                {metadata.subscriptionDuration}
              </Typography>
            </Grid>
          )}

          {/* Refund Status */}
          {(metadata.refund || metadata.refunded) && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Refund Status
              </Typography>
              <Chip
                size="small"
                label={
                  metadata.isPartialRefund ? "Partial Refund" : "Full Refund"
                }
                color="warning"
              />
            </Grid>
          )}

          {/* Refund Amount */}
          {metadata.refundAmount !== undefined && metadata.refundAmount > 0 && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Refund Amount
              </Typography>
              <Typography variant="body2" color="error">
                {formatCurrency(metadata.refundAmount)}
              </Typography>
            </Grid>
          )}

          {/* Refund Date */}
          {metadata.refundedAt && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Refund Date
              </Typography>
              <Typography variant="body2">
                {formatDate(new Date(metadata.refundedAt))}
              </Typography>
            </Grid>
          )}

          {/* Refund Reason */}
          {metadata.refundReason && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Refund Reason
              </Typography>
              <Typography variant="body2">{metadata.refundReason}</Typography>
            </Grid>
          )}

          {/* Admin Note */}
          {metadata.adminNote && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Admin Note
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  bgcolor: "action.hover",
                  p: 1,
                  borderRadius: 1,
                  fontStyle: "italic",
                }}
              >
                {metadata.adminNote}
              </Typography>
            </Grid>
          )}

          {/* Checkout Session ID */}
          {metadata.checkoutSessionId && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Checkout Session ID
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                }}
              >
                {metadata.checkoutSessionId}
              </Typography>
            </Grid>
          )}
        </Grid>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      sx={{
        "& .MuiDialog-paper": {
          [theme.breakpoints.down("sm")]: {
            margin: 0,
            width: "100%",
            maxWidth: "100%",
            height: "100%",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          [theme.breakpoints.down("sm")]: {
            py: 1.5,
            fontSize: "1.25rem",
          },
        }}
      >
        <span>Transaction Details</span>
        <Chip
          label={getTypeLabel(transaction.type)}
          size="small"
          color="primary"
          variant="outlined"
        />
      </DialogTitle>
      <DialogContent dividers>
        {/* Transaction ID */}
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Transaction ID
          </Typography>
          <Typography
            variant="body2"
            sx={{
              wordBreak: "break-all",
              fontFamily: "monospace",
              [theme.breakpoints.down("sm")]: { fontSize: "0.75rem" },
            }}
          >
            {transaction._id}
          </Typography>
        </Box>

        {/* Main Transaction Info */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Status
            </Typography>
            <Chip
              size={isMobile ? "small" : "medium"}
              label={
                transaction.status.charAt(0).toUpperCase() +
                transaction.status.slice(1)
              }
              color={getStatusColor(transaction.status) as any}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Amount
            </Typography>
            <Typography
              variant="body1"
              fontWeight="bold"
              color={transaction.amount < 0 ? "error.main" : "success.main"}
            >
              {transaction.amount < 0 ? "-" : "+"}
              {formatCurrency(Math.abs(transaction.amount))}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Date
            </Typography>
            <Typography variant="body2">
              {formatDate(new Date(transaction.createdAt))}
            </Typography>
          </Grid>
          {transaction.paymentGateway && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Payment Gateway
              </Typography>
              <Typography variant="body2" textTransform="capitalize">
                {transaction.paymentGateway}
              </Typography>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Balance Information */}
        <Typography variant="h6" gutterBottom>
          Balance Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Previous Balance
            </Typography>
            <Typography variant="body2">
              {transaction.previousBalance !== undefined
                ? `${transaction.previousBalance} units`
                : "N/A"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Current Balance
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {transaction.currentBalance !== undefined
                ? `${transaction.currentBalance} units`
                : "N/A"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Change
            </Typography>
            <Typography
              variant="body2"
              fontWeight="bold"
              color={
                (transaction.currentBalance ?? 0) -
                  (transaction.previousBalance ?? 0) >=
                0
                  ? "success.main"
                  : "error.main"
              }
            >
              {(transaction.currentBalance ?? 0) -
                (transaction.previousBalance ?? 0) >=
              0
                ? "+"
                : ""}
              {(transaction.currentBalance ?? 0) -
                (transaction.previousBalance ?? 0)}{" "}
              units
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Additional Metadata */}
        {renderMetadata()}

        {/* Gateway Transaction ID */}
        {transaction.gatewayTransactionId && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Gateway Transaction ID
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  bgcolor: "action.hover",
                  p: 1,
                  borderRadius: 1,
                }}
              >
                {transaction.gatewayTransactionId}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          [theme.breakpoints.down("sm")]: {
            px: 2,
            py: 1,
          },
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          size={isMobile ? "small" : "medium"}
          fullWidth={isMobile}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionDetailsModal;
