"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axiosInstance";
import Papa from "papaparse";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  DynamicForm as FormIcon,
  Api as ApiIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import LeadForm from "@/app/components/leadmanagement/leadform";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

// ---------- Types ----------

interface LeadField {
  id: string;
  label: string;
  value: any;
}

interface Lead {
  _id: string;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  leadSource?: string;
  aiQualityScore?: number;
  qualityLevel?: "High" | "Medium" | "Low";
  location?: {
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  fields: LeadField[];
  createdAt: string;
  updatedAt?: string;
  status:
    | "new"
    | "available"
    | "sold"
    | "assigned"
    | "qualified"
    | "unqualified"
    | "transferred";
  distributionMethod: "manual" | "round_robin" | "marketplace";
  exclusive: boolean;
  shared: boolean;
  shareNumber: number;
  unit: number;
  isManual: boolean;
  soldCount?: number;
  assignedTo?: Array<{
    buyerId: string;
    accepted: boolean;
    rejected: boolean;
    assignedAt: string;
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// ---------- Status Chip Colors ----------

const statusColors: Record<
  string,
  "primary" | "success" | "warning" | "info" | "error" | "default"
> = {
  new: "primary",
  available: "success",
  sold: "warning",
  assigned: "info",
  qualified: "success",
  unqualified: "error",
  transferred: "default",
};

const qualityColors: Record<string, "success" | "warning" | "error"> = {
  High: "success",
  Medium: "warning",
  Low: "error",
};

// ---------- Helper functions ----------

function getFieldValue(fields: LeadField[], pattern: RegExp): string {
  const field = fields.find((f) => pattern.test(f.label));
  return field ? String(field.value ?? "") : "—";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocation(location?: Lead["location"]): string {
  if (!location) return "—";
  const parts = [location.city, location.state, location.country].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

// ---------- Stats Card ----------

function StatsCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ==========================================================
//  MAIN COMPONENT
// ==========================================================

const LeadManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  // Lead form dialog state (for form builder leads)
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const theme = useTheme();

  const extractLeads = (data: any): Lead[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.leads)) return data.leads;
    if (Array.isArray(data?.data?.leads)) return data.data.leads;
    return [];
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/leads?limit=1000");
      setLeads(extractLeads(res.data));
    } catch (error) {
      console.error("Error fetching leads:", error);
      notify("Failed to load leads", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ---------- Partition leads ----------
  // A lead is "Form Builder" only if it was manually created or has no leadSource.
  // Everything else (zapier, api, api_test, or any external source) goes to the API tab.

  const isApiLead = (l: Lead) => {
    if (!l.leadSource) return false;
    // Form builder leads typically have no leadSource or "form"
    const formSources = ["form", "manual", ""];
    return !formSources.includes(l.leadSource.toLowerCase());
  };

  const formBuilderLeads = leads.filter((l) => !isApiLead(l));

  const zapierLeads = leads.filter((l) => isApiLead(l));

  // ---------- Handlers ----------

  const notify = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info",
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await axios.delete(`/api/leads?id=${leadId}`);
      setLeads((prev) => prev.filter((l) => l._id !== leadId));
      notify("Lead deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting lead:", error);
      notify("Failed to delete lead", "error");
    }
  };

  const toggleFavorite = async (leadId: string) => {
    const lead = leads.find((l) => l._id === leadId);
    if (!lead) return;
    try {
      setLeads((prev) =>
        prev.map((l) =>
          l._id === leadId ? { ...l, exclusive: !l.exclusive } : l,
        ),
      );
      await axios.patch(`/api/exclusive?id=${leadId}`, {
        exclusive: !lead.exclusive,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setLeads((prev) =>
        prev.map((l) =>
          l._id === leadId ? { ...l, exclusive: lead.exclusive } : l,
        ),
      );
    }
  };

  const handleOpenDialog = (lead: Lead | null = null) => {
    if (lead) {
      setSelectedLead(lead);
    } else {
      const defaultUserId =
        leads.length > 0 ? leads[0].userId : "defaultUserId";
      setSelectedLead({
        _id: "",
        userId: defaultUserId,
        fields: [],
        createdAt: new Date().toISOString(),
        status: "new",
        distributionMethod: "marketplace",
        exclusive: false,
        unit: 5,
        shared: false,
        shareNumber: 0,
        isManual: true,
      });
    }
    setOpenDialog(true);
  };

  const handleFormSubmit = async () => {
    if (!selectedLead) return;
    try {
      if (selectedLead._id) {
        await axios.put(`/api/leads?id=${selectedLead._id}`, selectedLead);
      } else {
        const { _id, ...newLead } = selectedLead;
        await axios.post(`/api/leads`, newLead);
      }
      notify("Lead saved successfully", "success");
      await fetchLeads();
      setOpenDialog(false);
      setSelectedLead(null);
    } catch (error) {
      console.error("Error saving lead:", error);
      notify("Failed to save lead", "error");
    }
  };

  // ---------- CSV ----------

  const exportToCSV = (leadsToExport: Lead[], filename: string) => {
    const csvData = leadsToExport.map((lead) => {
      const row: Record<string, any> = {
        Name: lead.name || getFieldValue(lead.fields, /name|full name/i),
        Email: lead.email || getFieldValue(lead.fields, /email/i),
        Phone:
          lead.phone ||
          getFieldValue(lead.fields, /phone|mobile|number|contact/i),
        Company: lead.company || "",
        Status: lead.status,
        Source: lead.leadSource || "form",
        "Created At": formatDate(lead.createdAt),
        Exclusive: lead.exclusive ? "Yes" : "No",
      };
      lead.fields.forEach((field) => {
        if (!row[field.label]) {
          row[field.label] = Array.isArray(field.value)
            ? field.value.join(", ")
            : field.value;
        }
      });
      return row;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/api/leads/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        notify(res.data.message || "Leads imported successfully", "success");
        await fetchLeads();
      } else {
        notify("Import failed: " + res.data.message, "error");
      }
    } catch (error) {
      console.error("Error importing leads:", error);
      notify("Error importing leads", "error");
    } finally {
      event.target.value = "";
    }
  };

  // ---------- Render ----------

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
        <LoadingComponent />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Lead Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {leads.length} total leads — {formBuilderLeads.length} from Form
            Builder, {zapierLeads.length} from API / Zapier
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchLeads}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="Total Leads"
            value={leads.length}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="New"
            value={leads.filter((l) => l.status === "new").length}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="Qualified"
            value={
              leads.filter(
                (l) => l.status === "qualified" || l.status === "available",
              ).length
            }
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatsCard
            title="Assigned / Sold"
            value={
              leads.filter(
                (l) => l.status === "assigned" || l.status === "sold",
              ).length
            }
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FormIcon fontSize="small" />
                Form Builder Leads
                <Chip
                  label={formBuilderLeads.length}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ApiIcon fontSize="small" />
                Zapier / API Leads
                <Chip
                  label={zapierLeads.length}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Tab 1: Form Builder Leads */}
      <TabPanel value={activeTab} index={0}>
        <FormBuilderLeadsTab
          leads={formBuilderLeads}
          onDelete={handleDeleteLead}
          onToggleFavorite={toggleFavorite}
          onEdit={handleOpenDialog}
          onExportCSV={() => exportToCSV(formBuilderLeads, "formbuilder-leads")}
          onImportCSV={importFromCSV}
          notify={notify}
        />
      </TabPanel>

      {/* Tab 2: Zapier / API Leads */}
      <TabPanel value={activeTab} index={1}>
        <ZapierLeadsTab
          leads={zapierLeads}
          onDelete={handleDeleteLead}
          onToggleFavorite={toggleFavorite}
          onExportCSV={() => exportToCSV(zapierLeads, "zapier-leads")}
          notify={notify}
          onRefresh={fetchLeads}
        />
      </TabPanel>

      {/* Lead Form Dialog (for form builder leads) */}
      <LeadForm
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedLead(null);
        }}
        onSubmit={handleFormSubmit}
        selectedLead={selectedLead}
        setSelectedLead={(lead) =>
          setSelectedLead((prev) =>
            typeof lead === "function" ? lead(prev as Lead) : lead,
          )
        }
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ==========================================================
//  TAB 1: FORM BUILDER LEADS
// ==========================================================

interface FormBuilderLeadsTabProps {
  leads: Lead[];
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (lead: Lead) => void;
  onExportCSV: () => void;
  onImportCSV: (event: React.ChangeEvent<HTMLInputElement>) => void;
  notify: (msg: string, sev?: "success" | "error" | "info" | "warning") => void;
}

function FormBuilderLeadsTab({
  leads,
  onDelete,
  onToggleFavorite,
  onEdit,
  onExportCSV,
  onImportCSV,
  notify,
}: FormBuilderLeadsTabProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nameSort, setNameSort] = useState<"asc" | "desc" | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuLead, setMenuLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getName = (lead: Lead) =>
    lead.name || getFieldValue(lead.fields, /name|full name|first name/i);
  const getEmail = (lead: Lead) =>
    lead.email || getFieldValue(lead.fields, /email|e-mail/i);
  const getPhone = (lead: Lead) =>
    lead.phone || getFieldValue(lead.fields, /phone|mobile|number|contact/i);

  const processed = React.useMemo(() => {
    let result = [...leads];

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const name = getName(l).toLowerCase();
        const email = getEmail(l).toLowerCase();
        const phone = getPhone(l).toLowerCase();
        const fieldValues = l.fields
          .map((f) => String(f.value ?? "").toLowerCase())
          .join(" ");
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          fieldValues.includes(q)
        );
      });
    }

    if (nameSort) {
      result.sort((a, b) => {
        const na = getName(a).toLowerCase();
        const nb = getName(b).toLowerCase();
        return nameSort === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
      });
    }

    return result;
  }, [leads, statusFilter, search, nameSort]);

  const displayed = processed.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 220, flex: isMobile ? 1 : "none" }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            label="Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="qualified">Qualified</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="sold">Sold</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={onExportCSV}
        >
          Export
        </Button>
        <input
          type="file"
          accept=".csv"
          onChange={onImportCSV}
          style={{ display: "none" }}
          id="csv-upload-fb"
        />
        <label htmlFor="csv-upload-fb">
          <Button
            variant="outlined"
            size="small"
            component="span"
            startIcon={<FileUploadIcon />}
          >
            Import
          </Button>
        </label>
      </Box>

      {/* Table */}
      {leads.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No leads from Form Builder yet. Leads captured via your forms will
          appear here.
        </Alert>
      ) : (
        <>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: "60vh" }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() =>
                        setNameSort((s) => (s === "asc" ? "desc" : "asc"))
                      }
                    >
                      Name
                      {nameSort === "asc" && (
                        <ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5 }} />
                      )}
                      {nameSort === "desc" && (
                        <ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell>Exclusive</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No leads match your filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((lead) => (
                    <TableRow
                      key={lead._id}
                      hover
                      sx={{ "&:last-child td": { borderBottom: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {getName(lead)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getPhone(lead)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {getEmail(lead)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={lead.status}
                          color={statusColors[lead.status] ?? "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {lead.qualityLevel || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => onToggleFavorite(lead._id)}
                        >
                          {lead.exclusive ? (
                            <FavoriteIcon color="error" fontSize="small" />
                          ) : (
                            <FavoriteBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(lead.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setMenuLead(lead);
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={processed.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            if (menuLead) {
              setDetailsLead(menuLead);
              setDetailsOpen(true);
            }
            setAnchorEl(null);
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuLead) onEdit(menuLead);
            setAnchorEl(null);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuLead) onDelete(menuLead._id);
            setAnchorEl(null);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Lead Details</DialogTitle>
        <DialogContent dividers>
          {detailsLead && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Chip
                  label={detailsLead.status}
                  color={statusColors[detailsLead.status] ?? "default"}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(detailsLead.createdAt)}
                </Typography>
              </Box>
              {detailsLead.fields.map((field) => (
                <Box key={field.id}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    {field.label}
                  </Typography>
                  <Typography variant="body2">
                    {Array.isArray(field.value)
                      ? field.value.join(", ")
                      : String(field.value ?? "—")}
                  </Typography>
                </Box>
              ))}
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Distribution
                </Typography>
                <Typography variant="body2">
                  {detailsLead.distributionMethod} — Unit: {detailsLead.unit}
                  {detailsLead.shared
                    ? ` — Shared (${detailsLead.shareNumber} buyers)`
                    : ""}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ==========================================================
//  TAB 2: ZAPIER / API LEADS
// ==========================================================

interface ZapierLeadsTabProps {
  leads: Lead[];
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onExportCSV: () => void;
  notify: (msg: string, sev?: "success" | "error" | "info" | "warning") => void;
  onRefresh: () => Promise<void>;
}

function ZapierLeadsTab({
  leads,
  onDelete,
  onToggleFavorite,
  onExportCSV,
  notify,
  onRefresh,
}: ZapierLeadsTabProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nameSort, setNameSort] = useState<"asc" | "desc" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuLead, setMenuLead] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const processed = React.useMemo(() => {
    let result = [...leads];

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          (l.name ?? "").toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.phone ?? "").toLowerCase().includes(q) ||
          (l.company ?? "").toLowerCase().includes(q) ||
          (l.industry ?? "").toLowerCase().includes(q),
      );
    }

    if (nameSort) {
      result.sort((a, b) => {
        const na = (a.name ?? "").toLowerCase();
        const nb = (b.name ?? "").toLowerCase();
        return nameSort === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
      });
    }

    return result;
  }, [leads, statusFilter, search, nameSort]);

  const displayed = processed.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    notify("Lead ID copied", "success");
  };

  const handleEditOpen = (lead: Lead) => {
    setEditLead({ ...lead });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editLead) return;
    setEditSaving(true);
    try {
      await axios.put(`/api/leads?id=${editLead._id}`, editLead);
      notify("Lead updated successfully", "success");
      setEditOpen(false);
      setEditLead(null);
      await onRefresh();
    } catch (error) {
      console.error("Error updating lead:", error);
      notify("Failed to update lead", "error");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="Search by name, email, phone, company..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 280, flex: isMobile ? 1 : "none" }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            label="Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="qualified">Qualified</MenuItem>
            <MenuItem value="unqualified">Unqualified</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="sold">Sold</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={onExportCSV}
        >
          Export
        </Button>
      </Box>

      {/* Info banner */}
      {leads.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No leads from Zapier / API yet. Leads created via the Zapier
          integration or API will appear here. Go to{" "}
          <strong>Integrations → API Documentation</strong> to get started.
        </Alert>
      )}

      {leads.length > 0 && (
        <>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: "60vh" }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() =>
                        setNameSort((s) => (s === "asc" ? "desc" : "asc"))
                      }
                    >
                      Name
                      {nameSort === "asc" && (
                        <ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5 }} />
                      )}
                      {nameSort === "desc" && (
                        <ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>

                  <TableCell>Status</TableCell>
                  {!isMobile && <TableCell>Quality</TableCell>}

                  <TableCell>Date</TableCell>
                  <TableCell>Exclusive</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isMobile ? 9 : 11}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <Typography color="text.secondary">
                        No leads match your filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((lead) => (
                    <TableRow
                      key={lead._id}
                      hover
                      sx={{ "&:last-child td": { borderBottom: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {lead.name || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {lead.email || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {lead.phone || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={lead.status}
                          color={statusColors[lead.status] ?? "default"}
                          size="small"
                        />
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          {lead.qualityLevel ? (
                            <Tooltip
                              title={`AI Spam Score: ${lead.aiQualityScore ?? "N/A"}/100\nLevel: ${lead.qualityLevel}\n\nScore Scale: 0-100 (Higher = More Spam = Lower Quality)\n0-30: Low Spam = Excellent\n30-70: Medium Spam = Good\n70-100: High Spam = Poor`}
                            >
                              <Chip
                                label={lead.qualityLevel}
                                color={qualityColors[lead.qualityLevel]}
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              —
                            </Typography>
                          )}
                        </TableCell>
                      )}

                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(lead.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => onToggleFavorite(lead._id)}
                        >
                          {lead.exclusive ? (
                            <FavoriteIcon color="error" fontSize="small" />
                          ) : (
                            <FavoriteBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setMenuLead(lead);
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={processed.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            if (menuLead) {
              setDetailsLead(menuLead);
              setDetailsOpen(true);
            }
            setAnchorEl(null);
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuLead) handleEditOpen(menuLead);
            setAnchorEl(null);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuLead) copyId(menuLead._id);
            setAnchorEl(null);
          }}
        >
          <CopyIcon fontSize="small" sx={{ mr: 1 }} /> Copy Lead ID
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuLead) onDelete(menuLead._id);
            setAnchorEl(null);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Lead Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            Zapier / API Lead Details
            <Chip
              label={detailsLead?.leadSource || "zapier"}
              size="small"
              variant="outlined"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {detailsLead && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Status + Date */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Chip
                  label={detailsLead.status}
                  color={statusColors[detailsLead.status] ?? "default"}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(detailsLead.createdAt)}
                </Typography>
              </Box>

              {/* All Lead Information — dynamically rendered from fields[] */}
              {detailsLead.fields && detailsLead.fields.length > 0 && (
                <Card variant="outlined">
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      gutterBottom
                      display="block"
                    >
                      Lead Information
                    </Typography>
                    <Grid container spacing={2}>
                      {detailsLead.fields.map((field) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={field.id}>
                          <Typography variant="caption" color="text.secondary">
                            {field.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={field.id === "name" ? 500 : 400}
                          >
                            {Array.isArray(field.value)
                              ? field.value.join(", ")
                              : String(field.value ?? "—")}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Fallback: show top-level fields if fields[] is empty (legacy leads) */}
              {(!detailsLead.fields || detailsLead.fields.length === 0) && (
                <Card variant="outlined">
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      gutterBottom
                      display="block"
                    >
                      Lead Information
                    </Typography>
                    <Grid container spacing={2}>
                      {detailsLead.name && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Name
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {detailsLead.name}
                          </Typography>
                        </Grid>
                      )}
                      {detailsLead.email && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body2">
                            {detailsLead.email}
                          </Typography>
                        </Grid>
                      )}
                      {detailsLead.phone && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography variant="body2">
                            {detailsLead.phone}
                          </Typography>
                        </Grid>
                      )}
                      {detailsLead.company && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Company
                          </Typography>
                          <Typography variant="body2">
                            {detailsLead.company}
                          </Typography>
                        </Grid>
                      )}
                      {detailsLead.industry && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Industry
                          </Typography>
                          <Typography variant="body2">
                            {detailsLead.industry}
                          </Typography>
                        </Grid>
                      )}
                      {detailsLead.leadSource && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Lead Source
                          </Typography>
                          <Typography variant="body2">
                            {detailsLead.leadSource}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Quality & Assignment */}
              <Card variant="outlined">
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Quality & Assignment
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        AI Quality Score
                      </Typography>
                      <Tooltip
                        title={`Score Range: 0-100 (Lower = Better Quality)\n\n0-40: High Quality (Clean, Legitimate)\n40-70: Medium Quality (Some Red Flags)\n70-100: Low Quality (Spam/Suspicious)\n\nCurrent Score: ${detailsLead.aiQualityScore ?? "Not scored"}`}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2">
                            {detailsLead.aiQualityScore ?? "Not scored"}
                          </Typography>
                          {detailsLead.qualityLevel && (
                            <Chip
                              label={detailsLead.qualityLevel}
                              color={qualityColors[detailsLead.qualityLevel]}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Tooltip>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Exclusive
                      </Typography>
                      <Typography variant="body2">
                        {detailsLead.exclusive ? "Yes" : "No"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Unit Value
                      </Typography>
                      <Typography variant="body2">
                        {detailsLead.unit}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Distribution
                      </Typography>
                      <Typography variant="body2">
                        {detailsLead.distributionMethod}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Lead ID */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Lead ID: {detailsLead._id}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(detailsLead._id);
                    notify("Lead ID copied", "success");
                  }}
                >
                  <CopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Zapier Lead Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditLead(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Zapier / API Lead</DialogTitle>
        <DialogContent dividers>
          {editLead && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              {/* Dynamic lead fields from fields[] */}
              {editLead.fields && editLead.fields.length > 0 && (
                <>
                  <Typography variant="overline" color="text.secondary">
                    Lead Information
                  </Typography>
                  {editLead.fields.map((field, idx) => (
                    <TextField
                      key={field.id}
                      label={field.label}
                      fullWidth
                      value={
                        Array.isArray(field.value)
                          ? field.value.join(", ")
                          : String(field.value ?? "")
                      }
                      onChange={(e) =>
                        setEditLead((prev) => {
                          if (!prev) return prev;
                          const updatedFields = [...prev.fields];
                          updatedFields[idx] = {
                            ...updatedFields[idx],
                            value: e.target.value,
                          };
                          // Also sync top-level fields for backward compatibility
                          const updates: Partial<Lead> = {
                            fields: updatedFields,
                          };
                          const fieldId = field.id;
                          if (fieldId === "name") updates.name = e.target.value;
                          else if (fieldId === "email")
                            updates.email = e.target.value;
                          else if (fieldId === "phone")
                            updates.phone = e.target.value;
                          else if (fieldId === "company")
                            updates.company = e.target.value;
                          else if (fieldId === "industry")
                            updates.industry = e.target.value;
                          return { ...prev, ...updates };
                        })
                      }
                    />
                  ))}
                </>
              )}

              {/* Fallback: show top-level fields if fields[] is empty (legacy leads) */}
              {(!editLead.fields || editLead.fields.length === 0) && (
                <>
                  <Typography variant="overline" color="text.secondary">
                    Lead Information
                  </Typography>
                  <TextField
                    label="Name"
                    fullWidth
                    value={editLead.name || ""}
                    onChange={(e) =>
                      setEditLead((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Email"
                    fullWidth
                    type="email"
                    value={editLead.email || ""}
                    onChange={(e) =>
                      setEditLead((prev) =>
                        prev ? { ...prev, email: e.target.value } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Phone"
                    fullWidth
                    value={editLead.phone || ""}
                    onChange={(e) =>
                      setEditLead((prev) =>
                        prev ? { ...prev, phone: e.target.value } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Company"
                    fullWidth
                    value={editLead.company || ""}
                    onChange={(e) =>
                      setEditLead((prev) =>
                        prev ? { ...prev, company: e.target.value } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Industry"
                    fullWidth
                    value={editLead.industry || ""}
                    onChange={(e) =>
                      setEditLead((prev) =>
                        prev ? { ...prev, industry: e.target.value } : prev,
                      )
                    }
                  />
                </>
              )}

              {/* System fields — always editable */}
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                System Settings
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editLead.status || "new"}
                  label="Status"
                  onChange={(e) =>
                    setEditLead((prev) =>
                      prev
                        ? { ...prev, status: e.target.value as Lead["status"] }
                        : prev,
                    )
                  }
                >
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="qualified">Qualified</MenuItem>
                  <MenuItem value="unqualified">Unqualified</MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="sold">Sold</MenuItem>
                  <MenuItem value="transferred">Transferred</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Distribution Method</InputLabel>
                <Select
                  value={editLead.distributionMethod || "manual"}
                  label="Distribution Method"
                  onChange={(e) =>
                    setEditLead((prev) =>
                      prev
                        ? {
                            ...prev,
                            distributionMethod: e.target
                              .value as Lead["distributionMethod"],
                          }
                        : prev,
                    )
                  }
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="round_robin">Round Robin</MenuItem>
                  <MenuItem value="marketplace">Marketplace</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Unit Value"
                fullWidth
                type="number"
                value={editLead.unit}
                onChange={(e) =>
                  setEditLead((prev) =>
                    prev
                      ? { ...prev, unit: parseInt(e.target.value, 10) || 0 }
                      : prev,
                  )
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditOpen(false);
              setEditLead(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={editSaving}
          >
            {editSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LeadManagement;
