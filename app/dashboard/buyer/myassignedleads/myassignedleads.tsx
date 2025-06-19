"use client";
import React, { useEffect, useState } from "react";
import {
  Button,
  Typography,
  Skeleton,
  CircularProgress,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
  Divider,
  useMediaQuery,
  Theme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useRouter } from "next/navigation";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

interface ILead {
  _id: string;
  fields: Array<{ id: string; label: string; value: string }>;
  status: string;
  unit: number;
  createdAt?: string;
}

const AssignedLeads: React.FC = () => {
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingLead, setProcessingLead] = useState<string | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );

  // Fetch assigned leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/buyers/getAssignedLeads`);
      const data = await response.json();
      if (response.ok) {
        setLeads(data.leads);
      } else {
        enqueueSnackbar(data.error || "Failed to fetch leads", {
          variant: "error",
          autoHideDuration: 3000,
        });
      }
    } catch (error) {
      enqueueSnackbar("Network error while fetching leads", {
        variant: "error",
        autoHideDuration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch("/api/buyers/walletBalance");
      const data = await response.json();
      if (response.ok) {
        setCurrentBalance(data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance", error);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchWalletBalance();
  }, []);

  const handleAcceptOrReject = async (
    leadId: string,
    action: "accept" | "reject",
    leadUnit: number
  ) => {
    setProcessingLead(leadId);
    try {
      const response = await fetch("/api/buyers/acceptOrRejectlead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action }),
      });
      //("Response:", response);
      const result = await response.json();
      //("Result:", result);

      if (response.ok) {
        enqueueSnackbar(result.message, {
          variant: "success",
          autoHideDuration: 3000,
          // icon: <CheckCircleIcon fontSize="small" />,
        });
        await fetchLeads();
        await fetchWalletBalance();
      } else {
        if (result.error === "Insufficient credit balance") {
          setWalletDialogOpen(true);
          enqueueSnackbar(result.error, {
            variant: "warning",
            autoHideDuration: 5000,
            // icon: <ErrorIcon fontSize="small" />,
          });
        } else {
          enqueueSnackbar(result.error || "Failed to process request", {
            variant: "error",
            autoHideDuration: 5000,
            // icon: <ErrorIcon fontSize="small" />,
          });
        }
      }
    } catch (error) {
      enqueueSnackbar("Network error while processing your request", {
        variant: "error",
        autoHideDuration: 5000,
        // icon: <ErrorIcon fontSize="small" />,
      });
    } finally {
      setProcessingLead(null);
    }
  };

  const handleFundWallet = () => {
    setWalletDialogOpen(false);
    router.push("/dashboard/buyer/purchaseUnit");
  };

  const handleCloseWalletDialog = () => {
    setWalletDialogOpen(false);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "assigned":
        return <Chip label="Assigned" color="primary" size="small" />;
      case "sold":
        return <Chip label="Purchased" color="success" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 6 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={120} sx={{ mb: 2 }} />
        ))}
      </Container>
    );
  }

  if (leads.length === 0) {
    return (
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
          textAlign: "center",
        }}
      >
        <ErrorIcon color="action" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No assigned leads available
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You currently don't have any leads assigned to you. Please check back
          later.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, mt: 6 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 2 : 0,
        }}
      >
        <Typography variant="h5" component="h1">
          Your Assigned Leads
        </Typography>
        {currentBalance !== null && (
          <Chip
            icon={<AccountBalanceWalletIcon />}
            label={`Balance: ${currentBalance} credits`}
            color="secondary"
            variant="outlined"
          />
        )}
      </Box>

      <Grid container spacing={3}>
        {leads.map((lead) => (
          <Grid item xs={12} sm={6} md={4} key={lead._id}>
            <Card
              variant="outlined"
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="medium">
                    Lead #{lead._id.slice(-6).toUpperCase()}
                  </Typography>
                  {getStatusChip(lead.status)}
                </Box>

                <Divider sx={{ my: 2 }} />

                {lead.fields.map((field) => (
                  <Box key={field.id} sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {field.label}
                    </Typography>
                    <Typography variant="body2">{field.value}</Typography>
                  </Box>
                ))}

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Price
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {lead.unit} credits
                  </Typography>
                </Box>
              </CardContent>

              {lead.status === "assigned" && (
                <Box sx={{ p: 2, display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    fullWidth
                    onClick={() =>
                      handleAcceptOrReject(lead._id, "accept", lead.unit)
                    }
                    disabled={processingLead === lead._id}
                    startIcon={
                      processingLead === lead._id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : null
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    fullWidth
                    onClick={() =>
                      handleAcceptOrReject(lead._id, "reject", lead.unit)
                    }
                    disabled={processingLead === lead._id}
                    startIcon={
                      processingLead === lead._id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : null
                    }
                  >
                    Reject
                  </Button>
                </Box>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Insufficient Balance Dialog */}
      <Dialog open={walletDialogOpen} onClose={handleCloseWalletDialog}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ErrorIcon color="warning" />
          Insufficient Credits
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You don't have enough credits to purchase this lead. Please add more
            credits to your wallet to continue.
          </DialogContentText>
          {currentBalance !== null && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "action.hover",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <AccountBalanceWalletIcon color="action" />
              <Box>
                <Typography variant="caption" display="block">
                  Current Balance
                </Typography>
                <Typography variant="h6">{currentBalance} credits</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseWalletDialog}>Cancel</Button>
          <Button
            onClick={handleFundWallet}
            variant="contained"
            color="primary"
            startIcon={<AccountBalanceWalletIcon />}
          >
            Add Credits
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AssignedLeads;
