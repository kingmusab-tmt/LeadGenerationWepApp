"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Typography,
  Box,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Paper,
} from "@mui/material";
import {
  ContentCopy,
  Search as SearchIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  PauseCircle as InactiveIcon,
  FiberNew as NewIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  WarningAmber as WarningIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import BuyerTable from "@/app/components/leadbuyers/buyertable";
import BuyerFormEnhanced from "@/app/components/leadbuyers/BuyerFormEnhanced";
import { IBuyer } from "@/models/leadbuyers";
import { useInitializeUser } from "@/lib/hooks";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

// ---------- Stats Card ----------

function StatsCard({
  title,
  value,
  color,
  icon,
  subtitle,
}: {
  title: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Box sx={{ color, display: "flex" }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight="bold" sx={{ color }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Status Colors ----------

const statusChipColor: Record<
  string,
  "success" | "warning" | "error" | "info" | "primary"
> = {
  active: "success",
  new: "primary",
  inactive: "error",
  suspended: "warning",
};

const BuyersPage: React.FC = () => {
  const { currentUser } = useInitializeUser();
  const csrfFetch = useCSRFFetch();
  const [buyers, setBuyers] = useState<IBuyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openBuyerForm, setOpenBuyerForm] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedBuyer, setSelectedBuyer] = useState<Partial<IBuyer> | null>(
    null,
  );
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    buyerName?: string;
    buyerEmail?: string;
    emailSent?: boolean;
  }>({ open: false });
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    currentCount: 0,
    maxAllowed: 0,
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showEmbedSection, setShowEmbedSection] = useState(false);

  const sellerId = currentUser?.id || "";
  const [registrationLink, setRegistrationLink] = useState("");
  const [iframeCode, setIframeCode] = useState("");

  // ---------- Computed Stats ----------

  const stats = useMemo(() => {
    const total = buyers.length;
    const active = buyers.filter((b) => b.status === "active").length;
    const inactive = buyers.filter((b) => b.status === "inactive").length;
    const newBuyers = buyers.filter((b) => b.status === "new").length;
    return { total, active, inactive, newBuyers };
  }, [buyers]);

  // ---------- Filtered Buyers ----------

  const filteredBuyers = useMemo(() => {
    let result = [...buyers];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.email?.toLowerCase().includes(q) ||
          b.company?.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    return result;
  }, [buyers, searchQuery, statusFilter]);

  // ---------- Data Fetching ----------

  const fetchData = async () => {
    try {
      setLoading(true);

      // Update buyer statuses from "new" to "active" if they have purchased leads
      await csrfFetch("/api/sellers/update-buyer-status", { method: "POST" });

      const buyersResponse = await fetch("/api/buyers");
      if (!buyersResponse.ok) throw new Error("Failed to fetch buyers");
      const buyersData: IBuyer[] = await buyersResponse.json();
      setBuyers(buyersData);

      const limitsResponse = await fetch(
        `/api/subscriptions/limits?sellerId=${sellerId}`,
      );
      if (!limitsResponse.ok)
        throw new Error("Failed to fetch subscription limits");
      const limitsData = await limitsResponse.json();
      setSubscriptionLimits({
        currentCount: buyersData.length,
        maxAllowed: limitsData.data?.subscriptionLimits?.buyers || 0,
      });
    } catch (err) {
      setError((err as Error).message);
      setSnackbar({
        open: true,
        message: "Failed to load data.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchData();
      const link = `${window.location.origin}/RegisterBuyer?sellerId=${sellerId}`;
      const code = `<iframe src="${link}" width="100%" height="500px" style="border: none;"></iframe>`;
      setRegistrationLink(link);
      setIframeCode(code);
    }
  }, [sellerId]);

  // ---------- Handlers ----------

  const handleAddNewBuyer = () => {
    if (subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed) {
      setSnackbar({
        open: true,
        message: `You've reached your buyer limit (${subscriptionLimits.maxAllowed}). Please upgrade your subscription.`,
        severity: "warning",
      });
      return;
    }
    setSelectedBuyer(null);
    setOpenBuyerForm(true);
  };

  const handleEditBuyer = (buyer: IBuyer) => {
    setSelectedBuyer(buyer);
    setOpenBuyerForm(true);
  };

  const handleSaveBuyer = async (buyerData: Partial<IBuyer>) => {
    try {
      const isNewBuyer = !selectedBuyer;
      const response = selectedBuyer
        ? await fetch(`/api/buyers?id=${selectedBuyer._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buyerData),
          })
        : await fetch("/api/buyers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buyerData),
          });

      if (!response.ok) throw new Error("Failed to save buyer");

      const result = await response.json();

      fetchData();
      setOpenBuyerForm(false);

      // Show success modal for new buyers
      if (isNewBuyer) {
        setSuccessModal({
          open: true,
          buyerName: buyerData.name,
          buyerEmail: buyerData.email,
          emailSent: result.emailSent ?? true,
        });
      } else {
        setSnackbar({
          open: true,
          message: "Buyer updated!",
          severity: "success",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error saving buyer.",
        severity: "error",
      });
    }
  };

  const handleDelete = async (buyerId: string) => {
    try {
      const response = await fetch(`/api/buyers?id=${buyerId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete buyer");

      fetchData();
      setSnackbar({
        open: true,
        message: "Buyer deleted!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete buyer.",
        severity: "error",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSnackbar({
          open: true,
          message: `${label} copied to clipboard!`,
          severity: "success",
        });
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: "Failed to copy.",
          severity: "error",
        });
      });
  };

  const isLimitReached =
    subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed;

  const limitPercentage =
    subscriptionLimits.maxAllowed > 0
      ? Math.round(
          (subscriptionLimits.currentCount / subscriptionLimits.maxAllowed) *
            100,
        )
      : 0;

  return (
    <Box sx={{ width: "100%", p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Lead Buyer Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your lead buyers, registration, and distribution settings
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Tooltip title="Refresh data">
            <IconButton onClick={fetchData} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleAddNewBuyer}
            disabled={isLimitReached}
            size={isMobile ? "small" : "medium"}
          >
            Add Buyer
          </Button>
        </Box>
      </Box>

      {/* Limit Warning */}
      {isLimitReached && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
          action={
            <Button color="warning" size="small" variant="outlined">
              Upgrade
            </Button>
          }
        >
          You&apos;ve reached your buyer limit (
          {subscriptionLimits.currentCount}/{subscriptionLimits.maxAllowed}).
          Upgrade your subscription to add more buyers.
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="Total Buyers"
            value={stats.total}
            color={theme.palette.primary.main}
            icon={<PeopleIcon fontSize="small" />}
            subtitle={`${limitPercentage}% of limit`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="Active"
            value={stats.active}
            color={theme.palette.success.main}
            icon={<ActiveIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="New"
            value={stats.newBuyers}
            color={theme.palette.info.main}
            icon={<NewIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="Inactive"
            value={stats.inactive}
            color={theme.palette.error.main}
            icon={<InactiveIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {/* Registration / Embed Section (Collapsible) */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: "hidden" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            cursor: "pointer",
            "&:hover": { bgcolor: "action.hover" },
          }}
          onClick={() => setShowEmbedSection(!showEmbedSection)}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LinkIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Buyer Registration & Embed Code
            </Typography>
          </Box>
          {showEmbedSection ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={showEmbedSection}>
          <Box sx={{ px: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                  sx={{ display: "block" }}
                >
                  Registration Link
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={registrationLink}
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Copy registration link">
                            <IconButton
                              size="small"
                              onClick={() =>
                                copyToClipboard(
                                  registrationLink,
                                  "Registration link",
                                )
                              }
                              disabled={isLimitReached}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                  sx={{ display: "block" }}
                >
                  Iframe Embed Code
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={iframeCode}
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Copy iframe code">
                            <IconButton
                              size="small"
                              onClick={() =>
                                copyToClipboard(iframeCode, "Iframe code")
                              }
                              disabled={isLimitReached}
                            >
                              <CodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Search & Filter Toolbar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
          alignItems: { sm: "center" },
        }}
      >
        <TextField
          placeholder="Search by name, email, or company..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { sm: 400 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {filteredBuyers.length} of {buyers.length} buyer
          {buyers.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Buyer Table */}
      {loading ? (
        <LoadingComponent />
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredBuyers.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: "center",
          }}
        >
          <PeopleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {buyers.length === 0
              ? "No buyers registered yet"
              : "No buyers match your search"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {buyers.length === 0
              ? "Add your first buyer or share your registration link to get started."
              : "Try adjusting your search or filter criteria."}
          </Typography>
          {buyers.length === 0 && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleAddNewBuyer}
              disabled={isLimitReached}
            >
              Add First Buyer
            </Button>
          )}
        </Paper>
      ) : (
        <BuyerTable
          buyers={filteredBuyers}
          onDelete={handleDelete}
          onEdit={handleEditBuyer}
        />
      )}

      {/* Buyer Form Modal */}
      <Dialog
        open={openBuyerForm}
        onClose={() => setOpenBuyerForm(false)}
        maxWidth="lg"
        fullWidth
      >
        <BuyerFormEnhanced
          open={openBuyerForm}
          onClose={() => setOpenBuyerForm(false)}
          onSave={handleSaveBuyer}
          initialValues={selectedBuyer || undefined}
          sellerId={sellerId}
        />
      </Dialog>

      {/* Success Modal - New Buyer Registration */}
      <Dialog
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ActiveIcon sx={{ color: "success.main", fontSize: 28 }} />
            <Typography variant="h6">
              Buyer Registered Successfully! 🎉
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              p: 1.5,
              bgcolor: successModal.emailSent
                ? "success.lighter"
                : "warning.lighter",
              borderRadius: 1,
            }}
          >
            <EmailIcon
              sx={{
                color: successModal.emailSent ? "success.main" : "warning.main",
              }}
            />
            <Typography variant="body2">
              {successModal.emailSent
                ? `An email has been sent to ${successModal.buyerEmail} with sign-in instructions.`
                : `Buyer created, but email notification could not be sent. Please inform the buyer manually.`}
            </Typography>
          </Box>

          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>{successModal.buyerName}</strong> has been registered as a
            lead buyer.
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            The buyer will receive an email with instructions to:
          </Typography>

          <List sx={{ mb: 2 }}>
            <ListItem sx={{ pl: 0, py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600, color: "primary.main" }}>
                  1.
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary="Sign in with their Google account"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
            <ListItem sx={{ pl: 0, py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600, color: "primary.main" }}>
                  2.
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary='Select "Buyer" on the role selection page'
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
            <ListItem sx={{ pl: 0, py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600, color: "primary.main" }}>
                  3.
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary="Access their buyer dashboard"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
            <ListItem sx={{ pl: 0, py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600, color: "primary.main" }}>
                  4.
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary="Update their profile information if needed"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
          </List>

          <Box
            sx={{
              bgcolor: "info.lighter",
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "info.light",
            }}
          >
            <Typography variant="caption" display="block">
              <strong>Note:</strong> The email includes your company information
              and the registration details you provided. The buyer can update
              their information from their dashboard.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setSuccessModal({ open: false })}
          >
            Got It
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          variant="filled"
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BuyersPage;
