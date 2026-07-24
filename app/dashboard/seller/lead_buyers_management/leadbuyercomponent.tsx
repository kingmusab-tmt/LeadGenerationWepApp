"use client";
import React, { useEffect, useState, useCallback } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  ContentCopy,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  WarningAmber as WarningIcon,
  Email as EmailIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
} from "@mui/icons-material";
import dynamic from "next/dynamic";
import BuyerFormEnhanced from "@/app/components/leadbuyers/BuyerFormEnhanced";

const BuyerTable = dynamic(
  () => import("@/app/components/leadbuyers/buyertable"),
  { ssr: false },
);
import { IBuyer } from "@/models/leadbuyers";
import { useInitializeUser, useDashboardTerms } from "@/app/hooks";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useSubscriptionLimits } from "@/app/hooks/useSubscriptionLimits";
import Papa from "papaparse";
import axios from "@/lib/axiosInstance";

const BuyersPage: React.FC = () => {
  const { currentUser } = useInitializeUser();
  const terms = useDashboardTerms();
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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean;
    buyerId?: string;
  }>({ open: false });
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    currentCount: 0,
    maxAllowed: null as number | null,
  });
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });
  const [rowCount, setRowCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    new: 0,
    suspended: 0,
  });

  // Subscription limits for export/import permissions
  const { limits: subLimits } = useSubscriptionLimits();
  const canExport = subLimits?.exports ?? false;
  const canImport = subLimits?.imports ?? false;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showEmbedSection, setShowEmbedSection] = useState(false);

  const sellerId = currentUser?.id || "";
  const [registrationLink, setRegistrationLink] = useState("");
  const [iframeCode, setIframeCode] = useState("");

  // Debounce the search query so typing doesn't trigger a server fetch on
  // every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Jump back to page 1 whenever the search/status filter changes — staying
  // on, say, page 3 of a now much-shorter filtered result set would show an
  // empty grid with no obvious explanation.
  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [debouncedSearchQuery, statusFilter]);

  // ---------- Data Fetching ----------
  // Previously fetched every buyer for the seller in one unbounded request
  // and filtered/paginated entirely client-side. Now paginated server-side
  // (see GET /api/buyers) — buyers holds only the current page, search/status
  // are applied by the server, and rowCount/statusCounts track the true
  // totals independently of what's currently loaded.

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Awaited (not fire-and-forget) so the buyers fetch below always reflects
      // the latest auto-activation statuses — previously this ran concurrently
      // with the buyers fetch, so a manual Refresh could still show stale
      // statuses if the update hadn't committed yet.
      await csrfFetch("/api/sellers/update-buyer-status", {
        method: "POST",
      }).catch(() => {});

      const params = new URLSearchParams({
        page: String(paginationModel.page + 1),
        limit: String(paginationModel.pageSize),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearchQuery.trim()) {
        params.set("search", debouncedSearchQuery.trim());
      }

      const [buyersResponse, limitsResponse] = await Promise.all([
        fetch(`/api/buyers?${params.toString()}`),
        fetch(`/api/subscriptions/limits?sellerId=${sellerId}`),
      ]);

      if (!buyersResponse.ok) throw new Error("Failed to fetch buyers");
      if (!limitsResponse.ok)
        throw new Error("Failed to fetch subscription limits");

      const [buyersPayload, limitsData] = await Promise.all([
        buyersResponse.json(),
        limitsResponse.json(),
      ]);

      const data = buyersPayload?.data ?? {};
      setBuyers(Array.isArray(data.buyers) ? data.buyers : []);
      setRowCount(data.pagination?.total ?? 0);
      setStatusCounts({
        total: data.counts?.total ?? 0,
        active: data.counts?.active ?? 0,
        inactive: data.counts?.inactive ?? 0,
        new: data.counts?.new ?? 0,
        suspended: data.counts?.suspended ?? 0,
      });

      setSubscriptionLimits({
        // The live, account-wide count from /api/subscriptions/limits — not
        // derived from the (now paginated) buyers array, which would only
        // ever reflect one page's length.
        currentCount: limitsData.data?.currentCount ?? data.counts?.total ?? 0,
        // Preserve null (still loading / genuinely unknown) distinctly from
        // a real 0 — this previously coerced a missing field to 0, and
        // since 0 >= 0 is always true, that permanently locked out buyer
        // creation for any account whose subscription document happened to
        // lack this nested field, with a message that looked like a real
        // usage cap rather than a data problem.
        maxAllowed: limitsData.data?.subscriptionLimits?.buyers ?? null,
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
  }, [
    csrfFetch,
    sellerId,
    paginationModel.page,
    paginationModel.pageSize,
    statusFilter,
    debouncedSearchQuery,
  ]);

  useEffect(() => {
    if (sellerId) {
      fetchData();
    }
  }, [fetchData, sellerId]);

  useEffect(() => {
    if (sellerId) {
      const link = `${window.location.origin}/RegisterBuyer?sellerId=${sellerId}`;
      const code = `<iframe src="${link}" width="100%" height="500px" style="border: none;"></iframe>`;
      setRegistrationLink(link);
      setIframeCode(code);
    }
  }, [sellerId]);

  // ---------- Handlers ----------

  const handleAddNewBuyer = () => {
    if (loading || subscriptionLimits.maxAllowed === null) {
      setSnackbar({
        open: true,
        message: "Please wait while subscription limits are loading.",
        severity: "info",
      });
      return;
    }

    // 0 means unlimited (matches the backend convention in
    // lib/subscriptionLimitsService.ts) — only block when there's a real,
    // positive limit that's been reached.
    if (
      subscriptionLimits.maxAllowed > 0 &&
      subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed
    ) {
      setSnackbar({
        open: true,
        message: `You've reached your ${terms.buyerLower} limit (${subscriptionLimits.maxAllowed}). Please upgrade your subscription.`,
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
    // Deliberately does NOT catch its own errors: BuyerFormEnhanced.handleSubmit
    // already wraps this call in a try/catch that shows an error and keeps the
    // dialog open on failure — swallowing the error here defeated that and
    // made every failed save look like a success to the seller.
    const isNewBuyer = !selectedBuyer;
    const response = selectedBuyer
      ? await csrfFetch(`/api/buyers?id=${selectedBuyer._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buyerData),
        })
      : await csrfFetch("/api/buyers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buyerData),
        });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(
        body?.message || body?.error || `Failed to save ${terms.buyerLower}`,
      );
    }

    const result = await response.json();

    fetchData();
    setOpenBuyerForm(false);

    // Show success modal for new buyers
    if (isNewBuyer) {
      setSuccessModal({
        open: true,
        buyerName: buyerData.name,
        buyerEmail: buyerData.email,
        emailSent: result.emailSent === true,
      });
    } else {
      setSnackbar({
        open: true,
        message: `${terms.buyer} updated!`,
        severity: "success",
      });
    }
  };

  const handleDelete = (buyerId: string) => {
    setDeleteConfirmModal({
      open: true,
      buyerId,
    });
  };

  const confirmDeleteBuyer = async () => {
    if (!deleteConfirmModal.buyerId) {
      return;
    }

    try {
      const response = await csrfFetch(
        `/api/buyers?id=${deleteConfirmModal.buyerId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.message || body?.error || `Failed to delete ${terms.buyerLower}`,
        );
      }

      await fetchData();
      setSnackbar({
        open: true,
        message: `${terms.buyer} deleted!`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : `Failed to delete ${terms.buyerLower}.`,
        severity: "error",
      });
    } finally {
      setDeleteConfirmModal({ open: false });
    }
  };

  // ---------- Export/Import ----------

  // Prevents CSV/formula injection: a cell value beginning with =, +, -, or
  // @ can be interpreted as a formula by Excel/Sheets when the exported file
  // is opened, potentially executing attacker-supplied content (e.g. a
  // buyer's business description containing =HYPERLINK(...)). Prefixing
  // with a leading apostrophe forces spreadsheet apps to treat it as text.
  const sanitizeCsvField = (value: string): string =>
    /^[=+\-@]/.test(value) ? `'${value}` : value;

  // buyers now only holds the current page — exporting needs every buyer
  // matching the active search/status filter, so this fetches its own pages
  // directly from the API rather than reusing component state.
  const EXPORT_PAGE_SIZE = 100;
  const EXPORT_MAX_PAGES = 50; // safety cap: 5,000 buyers

  const exportToCSV = async () => {
    try {
      const allBuyers: IBuyer[] = [];
      const params = new URLSearchParams({ limit: String(EXPORT_PAGE_SIZE) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearchQuery.trim()) {
        params.set("search", debouncedSearchQuery.trim());
      }

      for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
        params.set("page", String(page));
        const res = await fetch(`/api/buyers?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch buyers for export");
        const payload = await res.json();
        const pageBuyers: IBuyer[] = Array.isArray(payload?.data?.buyers)
          ? payload.data.buyers
          : [];
        allBuyers.push(...pageBuyers);
        const total = payload?.data?.pagination?.total ?? allBuyers.length;
        if (allBuyers.length >= total || pageBuyers.length === 0) break;
      }

      const csvData = allBuyers.map((buyer) => ({
        Name: sanitizeCsvField(buyer.name || ""),
        Email: sanitizeCsvField(buyer.email || ""),
        Phone: sanitizeCsvField(buyer.phone || ""),
        Company: sanitizeCsvField(buyer.company || ""),
        "Business Description": sanitizeCsvField(
          buyer.businessDescription || "",
        ),
        Priority: buyer.priority || 5,
        "Max Leads Per Day": buyer.maxLeadsPerDay || 10,
        Status: buyer.status || "new",
        "Preferred Distribution": buyer.preferredDistribution || "Automatic",
        Location: sanitizeCsvField(
          buyer.leadPreferences?.location
            ? Array.isArray(buyer.leadPreferences.location)
              ? buyer.leadPreferences.location.join(", ")
              : buyer.leadPreferences.location
            : "",
        ),
        Industries: sanitizeCsvField(
          buyer.leadPreferences?.industries?.join(", ") || "",
        ),
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "buyers-export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setSnackbar({
        open: true,
        message:
          err instanceof Error ? err.message : "Failed to export buyers",
        severity: "error",
      });
    }
  };

  const importFromCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/api/buyers/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || `${terms.buyers} imported successfully`,
          severity: "success",
        });
        await fetchData();
      } else {
        setSnackbar({
          open: true,
          message: "Import failed: " + res.data.message,
          severity: "error",
        });
      }
    } catch (err) {
      console.error(`Error importing ${terms.buyersLower}:`, err);
      setSnackbar({
        open: true,
        message: `Error importing ${terms.buyersLower}`,
        severity: "error",
      });
    } finally {
      event.target.value = "";
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
    subscriptionLimits.maxAllowed !== null &&
    subscriptionLimits.maxAllowed > 0 &&
    subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed;

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
            {terms.leadBuyer} Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your {terms.leadBuyers.toLowerCase()}, registration, and
            distribution settings
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Tooltip title="Refresh data">
            <IconButton onClick={fetchData} size="small" aria-label="Refresh data">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => setShowEmbedSection(true)}
            size={isMobile ? "small" : "medium"}
          >
            Registration &amp; Embed Code
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleAddNewBuyer}
            disabled={
              loading ||
              subscriptionLimits.maxAllowed === null ||
              isLimitReached
            }
            size={isMobile ? "small" : "medium"}
          >
            Add {terms.buyer}
          </Button>
        </Box>
      </Box>

      {/* Limit Warning */}
      {subscriptionLimits.maxAllowed !== null && isLimitReached && (
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
          You&apos;ve reached your {terms.buyerLower} limit (
          {subscriptionLimits.currentCount}/{subscriptionLimits.maxAllowed}).
          Upgrade your subscription to add more {terms.buyersLower}.
        </Alert>
      )}

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

        {/* Export/Import Buttons */}
        {canExport && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={exportToCSV}
          >
            Export
          </Button>
        )}
        {canImport && (
          <>
            <Button
              variant="text"
              size="small"
              href="/templates/buyers-import-template.csv"
              download="buyers-import-template.csv"
              sx={{ textTransform: "none" }}
            >
              Download Template
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={importFromCSV}
              style={{ display: "none" }}
              id="csv-upload-buyers"
            />
            <label htmlFor="csv-upload-buyers">
              <Button
                variant="outlined"
                size="small"
                component="span"
                startIcon={<FileUploadIcon />}
              >
                Import
              </Button>
            </label>
          </>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {rowCount === 0
            ? `0 ${terms.buyersLower}`
            : `${paginationModel.page * paginationModel.pageSize + 1}-${Math.min(
                rowCount,
                (paginationModel.page + 1) * paginationModel.pageSize,
              )} of ${rowCount} ${
                rowCount !== 1 ? terms.buyersLower : terms.buyerLower
              }`}
        </Typography>
      </Box>

      {loading && buyers.length > 0 && <LinearProgress sx={{ mb: 1 }} />}

      {/* Buyer Table */}
      {/* Only the first load (no data yet) replaces this section with a
          spinner — a post-mutation Refresh now keeps the existing table
          visible with a thin progress bar on top instead of tearing down
          and re-mounting the whole grid. */}
      {loading && buyers.length === 0 ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : rowCount === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: "center",
          }}
        >
          <PeopleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {statusCounts.total === 0
              ? `No ${terms.buyersLower} registered yet`
              : `No ${terms.buyersLower} match your search`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {statusCounts.total === 0
              ? `Add your first ${terms.buyerLower} or share your registration link to get started.`
              : "Try adjusting your search or filter criteria."}
          </Typography>
          {statusCounts.total === 0 && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleAddNewBuyer}
              disabled={isLimitReached}
            >
              Add First {terms.buyer}
            </Button>
          )}
        </Paper>
      ) : (
        <BuyerTable
          buyers={buyers}
          onDelete={handleDelete}
          onEdit={handleEditBuyer}
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          loading={loading}
        />
      )}

      {/* Registration & Embed Code — moved from an always-visible collapsible
          section into a dialog opened from the header, next to Add Buyer. */}
      <Dialog
        open={showEmbedSection}
        onClose={() => setShowEmbedSection(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {terms.buyer} Registration &amp; Embed Code
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <Box>
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
                            aria-label="Copy registration link"
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box>
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
                            aria-label="Copy iframe embed code"
                          >
                            <CodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEmbedSection(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Buyer Form Modal — BuyerFormEnhanced owns its own Dialog internally;
          wrapping it in a second Dialog here used to mount two independent
          modal instances (two backdrops, two focus traps) at once. */}
      <BuyerFormEnhanced
        open={openBuyerForm}
        onClose={() => setOpenBuyerForm(false)}
        onSave={handleSaveBuyer}
        initialValues={selectedBuyer || undefined}
        sellerId={sellerId}
      />

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
              {terms.buyer} Registered Successfully! 🎉
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
                : `${terms.buyer} created, but email notification could not be sent. Please inform the ${terms.buyerLower} manually.`}
            </Typography>
          </Box>

          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>{successModal.buyerName}</strong> has been registered as{" "}
            {terms.isBusinessAdmin ? "staff" : "a lead buyer"}.
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            The {terms.buyerLower} will receive an email with instructions to:
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
                primary={`Their account is automatically set up with ${terms.buyerLower} access`}
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
                primary={`Access their ${terms.buyerLower} dashboard`}
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
              and the registration details you provided. The {terms.buyerLower}{" "}
              can update their information from their dashboard.
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

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WarningIcon sx={{ color: "warning.main", fontSize: 28 }} />
            <Typography variant="h6">Delete {terms.buyer}?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            If you delete this {terms.buyerLower}, they will lose access to
            your platform.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmModal({ open: false })}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteBuyer}
          >
            Delete {terms.buyer}
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
