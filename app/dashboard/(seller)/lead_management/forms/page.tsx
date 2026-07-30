"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  TextField,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import SearchIcon from "@mui/icons-material/Search";
import CodeIcon from "@mui/icons-material/Code";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useRouter } from "next/navigation";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { industryNiches } from "@/utils/industryNiches";
import { formatLeadSource } from "@/utils/leadSources";

type FormType = {
  formName: string;
  formId: string;
  createdAt: string;
  status?: "draft" | "published";
  leadSource?: string;
  industry?: string;
  leadCount?: number;
};

// 5 cards across, 2 rows per page.
const COLUMNS = 5;
const PAGE_SIZE = COLUMNS * 2;

const industryLabel = (value?: string) =>
  industryNiches.find((i) => i.value === value)?.label || value;

export default function SellerForms() {
  const [forms, setForms] = useState<FormType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published"
  >("all");
  const [expandedEmbed, setExpandedEmbed] = useState<Record<string, boolean>>(
    {},
  );
  const [page, setPage] = useState(1);
  const router = useRouter();
  const csrfFetch = useCSRFFetch();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const fetchForms = async () => {
    try {
      setLoadError(null);
      const response = await fetch(`/api/form/userform`);
      if (!response.ok) throw new Error("Failed to fetch forms");
      const result: FormType[] = await response.json();
      setForms(result);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return forms.filter((form) => {
      if (statusFilter !== "all") {
        const formStatus = form.status === "draft" ? "draft" : "published";
        if (formStatus !== statusFilter) return false;
      }
      if (!query) return true;
      return (
        form.formName.toLowerCase().includes(query) ||
        (form.leadSource || "").toLowerCase().includes(query) ||
        (form.industry || "").toLowerCase().includes(query)
      );
    });
  }, [forms, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredForms.length / PAGE_SIZE));

  // Whenever the search/filter narrows the result set (or a delete/clone
  // shrinks it), clamp back to the last valid page instead of showing blank.
  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const pagedForms = filteredForms.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbar({
        open: true,
        message: "Copied to clipboard!",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Couldn't copy automatically — please select and copy manually.",
        severity: "error",
      });
    }
  };

  const handleDeleteClick = async (formId: string) => {
    const confirmed = await confirm({
      title: "Delete Form",
      message:
        "Are you sure you want to delete this form? Leads already captured through it are not deleted, but the form will stop accepting new submissions and its embed link/code will stop working. This cannot be undone.",
      confirmText: "Delete",
      confirmColor: "error",
    });
    if (!confirmed) return;

    try {
      const response = await csrfFetch(`/api/form/delete?id=${formId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete form");
      setForms((prev) => prev.filter((form) => form.formId !== formId));
      setSnackbar({
        open: true,
        message: "Form deleted successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
        severity: "error",
      });
    }
  };

  const handleClone = async (formId: string) => {
    const confirmed = await confirm({
      title: "Clone Form",
      message:
        "This creates a full copy of this form — including its draft/published status and any allowed-domain restriction — and counts against your plan's form limit. Continue?",
      confirmText: "Clone",
      confirmColor: "primary",
    });
    if (!confirmed) return;

    setCloningId(formId);
    try {
      const response = await csrfFetch("/api/form/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to clone form");
      }

      setSnackbar({
        open: true,
        message: result.data?.message || "Form cloned successfully!",
        severity: "success",
      });

      await fetchForms();
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
        severity: "error",
      });
    } finally {
      setCloningId(null);
    }
  };

  const handleEdit = (formId: string) => {
    router.push(`/dashboard/lead_management/forms/edit/${formId}`);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const toggleEmbed = (formId: string) => {
    setExpandedEmbed((prev) => ({ ...prev, [formId]: !prev[formId] }));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ mb: 4, fontWeight: "bold", color: "primary.main" }}
      >
        My Forms
      </Typography>

      {loading ? (
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
      ) : loadError ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="error" gutterBottom>
            Couldn&apos;t load your forms
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {loadError}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setLoading(true);
              fetchForms();
            }}
          >
            Retry
          </Button>
        </Paper>
      ) : forms.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Typography variant="h6">You have not created any forms</Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() =>
              router.push("/dashboard/lead_management/formbuilder")
            }
          >
            Click here to create a form
          </Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              size="small"
              placeholder="Search by name, lead source, or industry"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 220 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <ToggleButtonGroup
              size="small"
              value={statusFilter}
              exclusive
              onChange={(_e, value) => value && setStatusFilter(value)}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="published">Published</ToggleButton>
              <ToggleButton value="draft">Draft</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {filteredForms.length === 0 ? (
            <Paper elevation={2} sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                No forms match your search or filter.
              </Typography>
            </Paper>
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(1, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: `repeat(${COLUMNS}, 1fr)`,
                  },
                  gap: 2,
                }}
              >
                {pagedForms.map((form) => {
                  const isDraft = form.status === "draft";
                  const formUrl =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/forms/${form.formId}`
                      : `/forms/${form.formId}`;
                  const iframeId = `iframeID-${form.formId}`;
                  const iframeCode = `<script type="text/javascript">
\twindow.addEventListener("message", function (event) {
\t\tif (event.data.hasOwnProperty("FrameHeight")) {
\t\t\tvar iframe = document.getElementById("${iframeId}");
\t\t\tif (iframe) {
\t\t\t\tiframe.style.height = event.data.FrameHeight + "px";
\t\t\t}
\t\t}
\t\tif (event.data.hasOwnProperty("RedirectURL")) {
\t\t\twindow.location.href = event.data.RedirectURL;
\t\t}
\t});
</script>
<iframe id="${iframeId}" scrolling="no" style="border:0px;width:100%;overflow:hidden;min-height:400px;" src="${formUrl}"></iframe>`;
                  const embedOpen = !!expandedEmbed[form.formId];
                  return (
                    <Card
                      key={form.formId}
                      variant="outlined"
                      sx={{ display: "flex", flexDirection: "column" }}
                    >
                      <CardContent sx={{ pb: 1, "&:last-child": { pb: 1 } }}>
                        <Tooltip title={form.formName}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {form.formName}
                          </Typography>
                        </Tooltip>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mb: 1 }}
                        >
                          {new Date(form.createdAt).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          <Chip
                            label={isDraft ? "Draft" : "Published"}
                            color={isDraft ? "default" : "success"}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`${form.leadCount ?? 0} lead${
                              form.leadCount === 1 ? "" : "s"
                            }`}
                            size="small"
                            variant="outlined"
                          />
                          {form.leadSource && (
                            <Chip
                              label={formatLeadSource(form.leadSource)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {form.industry && (
                            <Chip
                              label={industryLabel(form.industry)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        <Button
                          size="small"
                          startIcon={<CodeIcon />}
                          onClick={() => toggleEmbed(form.formId)}
                          sx={{ mt: 1, px: 0 }}
                        >
                          {embedOpen ? "Hide embed code" : "Show embed code"}
                        </Button>

                        {embedOpen && (
                          <>
                            {isDraft && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 0.5 }}
                              >
                                Draft — won&apos;t accept submissions until
                                published.
                              </Typography>
                            )}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                width: "100%",
                                mt: 1,
                              }}
                            >
                              <TextField
                                fullWidth
                                value={formUrl}
                                variant="outlined"
                                size="small"
                                disabled
                              />
                              <IconButton
                                onClick={() => handleCopy(formUrl)}
                                aria-label="Copy form link"
                                size="small"
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                width: "100%",
                                mt: 1,
                              }}
                            >
                              <TextField
                                fullWidth
                                value={iframeCode}
                                variant="outlined"
                                size="small"
                                disabled
                                multiline
                                maxRows={3}
                              />
                              <IconButton
                                onClick={() => handleCopy(iframeCode)}
                                aria-label="Copy embed code"
                                size="small"
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </>
                        )}
                      </CardContent>
                      <CardActions sx={{ mt: "auto", justifyContent: "flex-end" }}>
                        <IconButton
                          onClick={() => handleEdit(form.formId)}
                          color="primary"
                          title="Edit Form"
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleClone(form.formId)}
                          color="info"
                          title="Clone Form"
                          disabled={cloningId === form.formId}
                          size="small"
                        >
                          {cloningId === form.formId ? (
                            <CircularProgress size={16} />
                          ) : (
                            <FileCopyIcon fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteClick(form.formId)}
                          color="error"
                          title="Delete Form"
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  );
                })}
              </Box>

              {pageCount > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(_e, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}
