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
import { ITransaction } from "@/models/transactions";
import { formatCurrency, formatDate } from "@/utils/formater";

interface TransactionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction: ITransaction | null;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  open,
  onClose,
  transaction,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  if (!transaction) return null;

  const renderMetadata = () => {
    const { metadata } = transaction;

    if (!metadata) return null;

    // Determine grid columns based on screen size
    const gridItemSize = isMobile ? 12 : isTablet ? 6 : 4;

    return (
      <>
        <Typography variant="h6" gutterBottom>
          Additional Details
        </Typography>
        <Grid container spacing={2}>
          {/* Common Fields */}
          {metadata.buyerId && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Buyer ID
              </Typography>
              <Typography variant="body2" noWrap>
                {metadata.buyerId}
              </Typography>
            </Grid>
          )}
          {metadata.userEmail && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                User Email
              </Typography>
              <Typography variant="body2" noWrap>
                {metadata.userEmail}
              </Typography>
            </Grid>
          )}
          {metadata.tierName && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Tier Name
              </Typography>
              <Typography variant="body2">{metadata.tierName}</Typography>
            </Grid>
          )}
          {metadata.tierType && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Tier Type
              </Typography>
              <Typography variant="body2">{metadata.tierType}</Typography>
            </Grid>
          )}

          {/* Lead Purchase */}
          {metadata.leadId && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Lead ID
              </Typography>
              <Typography variant="body2" noWrap>
                {metadata.leadId}
              </Typography>
            </Grid>
          )}
          {metadata.unitsPurchased && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Units Purchased
              </Typography>
              <Typography variant="body2">{metadata.unitsPurchased}</Typography>
            </Grid>
          )}

          {/* Seller Income */}
          {metadata.sellerId && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Seller ID
              </Typography>
              <Typography variant="body2" noWrap>
                {metadata.sellerId}
              </Typography>
            </Grid>
          )}
          {metadata.payoutId && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Payout ID
              </Typography>
              <Typography variant="body2" noWrap>
                {metadata.payoutId}
              </Typography>
            </Grid>
          )}

          {/* Subscription */}
          {metadata.subscriptionPlan && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Subscription Plan
              </Typography>
              <Typography variant="body2">
                {metadata.subscriptionPlan}
              </Typography>
            </Grid>
          )}
          {metadata.subscriptionDuration && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Subscription Duration
              </Typography>
              <Typography variant="body2">
                {metadata.subscriptionDuration}
              </Typography>
            </Grid>
          )}
          {metadata.subscriptionYears && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Subscription Years
              </Typography>
              <Typography variant="body2">
                {metadata.subscriptionYears}
              </Typography>
            </Grid>
          )}
          {metadata.tierRenewalDate && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Renewal Date
              </Typography>
              <Typography variant="body2">
                {formatDate(metadata.tierRenewalDate)}
              </Typography>
            </Grid>
          )}

          {/* Refund */}
          {metadata.refund && (
            <Grid item xs={gridItemSize}>
              <Typography variant="subtitle2" color="textSecondary">
                Refund Status
              </Typography>
              <Chip
                size={isMobile ? "small" : "medium"}
                label={metadata.refund ? "Refunded" : "Not Refunded"}
                color={metadata.refund ? "error" : "default"}
              />
            </Grid>
          )}
          {metadata.refundReason && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Refund Reason
              </Typography>
              <Typography variant="body2">{metadata.refundReason}</Typography>
            </Grid>
          )}

          {/* Admin Adjustment */}
          {metadata.adminNote && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Admin Note
              </Typography>
              <Typography variant="body2">{metadata.adminNote}</Typography>
            </Grid>
          )}
        </Grid>
      </>
    );
  };

  // Determine grid columns for main transaction info based on screen size
  const mainGridItemSize = isMobile ? 12 : 6;

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
          [theme.breakpoints.down("sm")]: {
            py: 1.5,
            fontSize: "1.25rem",
          },
        }}
      >
        Transaction Details
      </DialogTitle>
      <DialogContent dividers>
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Transaction ID
          </Typography>
          <Typography
            variant="body2"
            sx={{
              wordBreak: "break-word",
              [theme.breakpoints.down("sm")]: { fontSize: "0.875rem" },
            }}
          >
            {transaction._id}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={mainGridItemSize}>
            <Typography variant="subtitle2" color="textSecondary">
              Type
            </Typography>
            <Typography variant="body2">{transaction.type}</Typography>
          </Grid>
          <Grid item xs={mainGridItemSize}>
            <Typography variant="subtitle2" color="textSecondary">
              Status
            </Typography>
            <Chip
              size={isMobile ? "small" : "medium"}
              label={transaction.status}
              color={
                transaction.status === "completed"
                  ? "success"
                  : transaction.status === "failed"
                  ? "error"
                  : "warning"
              }
            />
          </Grid>
          <Grid item xs={mainGridItemSize}>
            <Typography variant="subtitle2" color="textSecondary">
              Amount
            </Typography>
            <Typography variant="body2">
              {formatCurrency(transaction.amount)}
            </Typography>
          </Grid>
          <Grid item xs={mainGridItemSize}>
            <Typography variant="subtitle2" color="textSecondary">
              Date
            </Typography>
            <Typography variant="body2">
              {formatDate(transaction.createdAt)}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Balance Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={mainGridItemSize}>
            <Typography variant="subtitle2" color="textSecondary">
              Previous Balance
            </Typography>
            <Typography variant="body2">
              {formatCurrency(transaction.previousBalance)}
            </Typography>
          </Grid>
          <Grid item xs={mainGridItemSize}>
            <Typography variant="subtitle2" color="textSecondary">
              Current Balance
            </Typography>
            <Typography variant="body2">
              {formatCurrency(transaction.currentBalance)}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {renderMetadata()}
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
