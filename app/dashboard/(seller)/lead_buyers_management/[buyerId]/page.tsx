"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Snackbar,
  Alert,
  Tab,
  Tabs,
  Paper,
  Avatar,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BuyerProfile from "@/app/components/leadbuyers/buyerprofile";
import LeadPurchaseHistory from "@/app/components/leadbuyers/leadpurchasehistory";
import { getBuyerStatusColor } from "@/app/components/leadbuyers/buyerStatusColor";
import { Buyer } from "@/types/buyer";
import { useDashboardTerms } from "@/app/hooks";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`buyer-tabpanel-${index}`}
      aria-labelledby={`buyer-tab-${index}`}
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      {value === index && children}
    </Box>
  );
}

const BuyerDetailsPage: React.FC = () => {
  const terms = useDashboardTerms();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });

  const params = useParams();
  const router = useRouter();
  const buyerId =
    typeof params.buyerId === "string"
      ? params.buyerId
      : (params.buyerId?.[0] ?? "");

  useEffect(() => {
    if (!buyerId) {
      // Previously this returned with loading still true, leaving the page
      // spinning forever with no way out for a malformed/missing route param.
      setError(`${terms.buyer} not found`);
      setLoading(false);
      return;
    }

    const fetchBuyer = async () => {
      try {
        const response = await fetch(`/api/buyers?buyerId=${buyerId}`);
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(
            body?.message ||
              body?.error ||
              `Failed to fetch ${terms.buyerLower} details`,
          );
        }

        const result = await response.json();
        const buyerData = result?.data;

        if (!buyerData) {
          setError(`${terms.buyer} not found`);
          setSnackbar({
            open: true,
            message: `${terms.buyer} not found`,
            severity: "warning",
          });
        } else {
          setBuyer({
            ...buyerData,
            notificationPreferences: buyerData.notificationPreferences || [],
          });
        }
      } catch (err) {
        setError((err as Error).message);
        setSnackbar({
          open: true,
          message:
            (err as Error).message ||
            `Error fetching ${terms.buyerLower} details`,
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBuyer();
  }, [buyerId]);

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {buyer ? (
        <>
          {/* Back navigation */}
          <Box
            onClick={() => router.push("/dashboard/lead_buyers_management")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              mb: 2,
              cursor: "pointer",
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
          >
            <ArrowBackIcon fontSize="small" />
            <Typography variant="body2">Back to {terms.buyers}</Typography>
          </Box>

          {/* Hero Header Card */}
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              borderRadius: 2,
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              color: "primary.contrastText",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 2, sm: 3 },
                flexWrap: "wrap",
              }}
            >
              <Avatar
                sx={{
                  width: { xs: 56, sm: 72 },
                  height: { xs: 56, sm: 72 },
                  bgcolor: "rgba(255,255,255,0.2)",
                  fontSize: { xs: "1.5rem", sm: "2rem" },
                  fontWeight: "bold",
                }}
              >
                {buyer.name?.charAt(0)?.toUpperCase() || "B"}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{ wordBreak: "break-word" }}
                >
                  {buyer.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.85, wordBreak: "break-word" }}
                >
                  {buyer.company || "No company"} &bull; {buyer.email}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {/* Previously this rendered a second, separate "Active"/
                    "Inactive" chip from buyer.isActive right next to this
                    one — a distinct field from status that could disagree
                    with it (e.g. a green "active" status next to a red
                    "Inactive" chip) with nothing explaining the difference.
                    isActive is now kept in sync with status server-side, so
                    a single status chip is both simpler and no longer risks
                    showing a contradiction. */}
                <Chip
                  label={buyer.status}
                  size="small"
                  sx={{
                    textTransform: "capitalize",
                    fontWeight: 600,
                    ...(getBuyerStatusColor(buyer.status || "") === "success"
                      ? { bgcolor: "success.light", color: "success.dark" }
                      : getBuyerStatusColor(buyer.status || "") === "error"
                        ? { bgcolor: "error.light", color: "error.dark" }
                        : getBuyerStatusColor(buyer.status || "") === "info"
                          ? { bgcolor: "info.light", color: "info.dark" }
                          : { bgcolor: "grey.300", color: "text.primary" }),
                  }}
                />
                <Chip
                  icon={
                    <AccountBalanceWalletIcon
                      sx={{ color: "inherit !important" }}
                    />
                  }
                  label={`${buyer.walletUnit ?? 0} Units`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "inherit",
                  }}
                />
              </Stack>
            </Box>
          </Paper>

          {/* Tabbed Content */}
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                px: { xs: 1, sm: 2 },
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                label={`${terms.buyer} Profile`}
                id="buyer-tab-0"
                aria-controls="buyer-tabpanel-0"
              />
              <Tab
                label="Transaction History"
                id="buyer-tab-1"
                aria-controls="buyer-tabpanel-1"
              />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
              <BuyerProfile buyer={buyer} />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <LeadPurchaseHistory id={buyerId} />
            </TabPanel>
          </Paper>
        </>
      ) : (
        <Alert severity="warning">{terms.buyer} not found.</Alert>
      )}
    </Container>
  );
};

export default BuyerDetailsPage;
