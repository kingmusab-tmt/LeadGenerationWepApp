"use client";
import { useState, useEffect } from "react";
import {
  Button,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Tooltip,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import dynamic from "next/dynamic";

const FormPreview = dynamic(
  () => import("@/app/components/leadcapture/FormPreview"),
  { ssr: false },
);

import { industryNiches } from "@/utils/industryNiches";
import { LEAD_SOURCES } from "@/utils/leadSources";
import { useRouter, useParams } from "next/navigation";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import {
  findDuplicateLabel,
  findEmptyOptionsField,
  isOptionsField,
  normalizeFieldsForSave,
} from "@/app/components/leadcapture/formFieldUtils";

interface Field {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export default function EditForm() {
  const fetchWithCSRF = useCSRFFetch();
  const router = useRouter();
  const params = useParams();
  const formId =
    typeof params.formId === "string"
      ? params.formId
      : (params.formId?.[0] ?? "");

  const [fields, setFields] = useState<Field[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>("");
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editHeadingLevel, setEditHeadingLevel] = useState<
    "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  >("h2");
  const [formName, setFormName] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  // No stored value means "published" — forms saved before this field
  // existed were always live, and must stay that way.
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [allowedOriginsInput, setAllowedOriginsInput] = useState<string>("");
  const [newFieldLabel, setNewFieldLabel] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });
  // Snapshot of what was actually loaded, so the unsaved-changes warning
  // below only fires on real edits — not on every load, which always
  // populates non-empty fields/formName.
  const [loadedSnapshot, setLoadedSnapshot] = useState<string | null>(null);

  // Load form data
  useEffect(() => {
    if (!formId) return;

    const fetchForm = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/form?formId=${formId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch form");
        }

        const result = await response.json();
        const data = result.data || result;
        setFields(data.fields || []);
        setFormName(data.formName || "");
        setLoadedSnapshot(
          JSON.stringify({ fields: data.fields || [], formName: data.formName || "" }),
        );

        // Prefer the real leadSource/industry fields (set directly since
        // creation stopped overloading `description` for this). Forms saved
        // before that fix only ever have this data inside `description`, as
        // "Lead Source: X | Industry: Y" — parsed here only as a fallback.
        if (data.leadSource || data.industry) {
          setLeadSource(data.leadSource || "");
          setIndustry(data.industry || "");
        } else if (data.description) {
          const descParts = data.description
            .split("|")
            .map((s: string) => s.trim());
          descParts.forEach((part: string) => {
            if (part.startsWith("Lead Source:")) {
              setLeadSource(part.replace("Lead Source:", "").trim());
            } else if (part.startsWith("Industry:")) {
              setIndustry(part.replace("Industry:", "").trim());
            }
          });
        }

        setStatus(data.status === "draft" ? "draft" : "published");
        setAllowedOriginsInput((data.allowedOrigins || []).join(", "));
      } catch (error) {
        setSnackbar({
          open: true,
          message:
            error instanceof Error ? error.message : "Failed to load form",
          severity: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  // Warn on tab close/refresh if there are edits that differ from what was
  // loaded. Doesn't cover in-app sidebar navigation — the App Router has no
  // built-in navigation-intercept hook — only the browser-level exit paths.
  useEffect(() => {
    if (loadedSnapshot === null) return;
    const currentSnapshot = JSON.stringify({ fields, formName });
    if (currentSnapshot === loadedSnapshot) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [fields, formName, loadedSnapshot]);

  // Add a new field
  const addField = (type: string) => {
    if (!newFieldLabel.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter a label for the field before adding it.",
        severity: "error",
      });
      return;
    }

    const newField: Field = {
      id: crypto.randomUUID(),
      type,
      label: newFieldLabel,
      required: false,
      options: isOptionsField(type) ? [] : undefined,
      headingLevel: type === "header" ? "h2" : undefined,
    };
    setFields([...fields, newField]);
    setNewFieldLabel("");
  };

  // Add lead contact fields
  const addLeadContactFields = () => {
    const contactFields: Field[] = [
      {
        id: crypto.randomUUID(),
        type: "text",
        label: "Name",
        required: false,
      },
      {
        id: crypto.randomUUID(),
        type: "email",
        label: "Email",
        required: false,
      },
      {
        id: crypto.randomUUID(),
        type: "tel",
        label: "Phone",
        required: false,
      },
      {
        id: crypto.randomUUID(),
        type: "city_autocomplete",
        label: "City",
        required: false,
      },
    ];
    setFields([...fields, ...contactFields]);
  };

  // Toggle field required status
  const toggleRequired = (id: string) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, required: !field.required } : field,
      ),
    );
  };

  // Delete field
  const deleteField = (id: string) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  // Edit field label
  const handleEditLabel = (id: string, newLabel: string) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, label: newLabel } : field,
      ),
    );
  };

  // Edit field options
  const handleEditOptions = (id: string, newOptions: string[]) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, options: newOptions } : field,
      ),
    );
  };

  // Start editing a field
  const startEditing = (id: string) => {
    const field = fields.find((field) => field.id === id);
    if (field) {
      setEditingFieldId(id);
      setEditLabel(field.label);
      setEditOptions(field.options || []);
      setEditHeadingLevel(field.headingLevel || "h2");
    }
  };

  // Save changes to the field being edited
  const saveFieldChanges = () => {
    if (editingFieldId) {
      handleEditLabel(editingFieldId, editLabel);
      if (isOptionsField(fields.find((field) => field.id === editingFieldId)?.type)) {
        handleEditOptions(editingFieldId, editOptions);
      }
      if (fields.find((field) => field.id === editingFieldId)?.type === "header") {
        setFields((prev) =>
          prev.map((field) =>
            field.id === editingFieldId
              ? { ...field, headingLevel: editHeadingLevel }
              : field,
          ),
        );
      }
      setEditingFieldId(null);
      setEditLabel("");
      setEditOptions([]);
      setEditHeadingLevel("h2");
    }
  };

  // Update form
  const handleUpdate = async () => {
    if (!formName.trim() || !leadSource.trim() || !industry.trim()) {
      setSnackbar({
        open: true,
        message:
          "Please fill in all required fields (Form Name, Lead Source, Industry).",
        severity: "error",
      });
      return;
    }

    if (fields.length === 0) {
      setSnackbar({
        open: true,
        message: "Please add at least one field to the form.",
        severity: "error",
      });
      return;
    }

    // Submissions are keyed by label, so two fields sharing a label would
    // silently overwrite each other's captured value.
    const duplicateLabel = findDuplicateLabel(fields);
    if (duplicateLabel) {
      setSnackbar({
        open: true,
        message: `Two fields are both labeled "${duplicateLabel}" — each field needs a unique label so submissions aren't lost.`,
        severity: "error",
      });
      return;
    }

    const emptyOptionsField = findEmptyOptionsField(fields);
    if (emptyOptionsField) {
      setSnackbar({
        open: true,
        message: `"${emptyOptionsField.label}" needs at least one option before you can save.`,
        severity: "error",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Map field types to match backend validation — the same normalization
      // the create screen applies, so a form saved from either screen ends
      // up with the same canonical type.
      const mappedFields = normalizeFieldsForSave(fields);

      const response = await fetchWithCSRF("/api/form/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId,
          fields: mappedFields,
          formName,
          leadSource,
          industry,
          status,
          allowedOrigins: allowedOriginsInput
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update form");
      }

      setSnackbar({
        open: true,
        message: result.message || "Form updated successfully!",
        severity: "success",
      });
      setLoadedSnapshot(JSON.stringify({ fields: mappedFields, formName }));

      // Redirect to forms list after a short delay
      setTimeout(() => {
        router.push("/dashboard/seller/lead_management/forms");
      }, 1500);
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to update form",
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading form...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, fontWeight: "bold" }}
        >
          Edit Form
        </Typography>
        <Button
          variant="outlined"
          onClick={() => router.push("/dashboard/seller/lead_management/forms")}
        >
          Back to Forms
        </Button>
      </Box>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Edit your custom form. Make changes and click Update to save.
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              Form Details
            </Typography>
            <Tooltip
              title="Provide a name for your form to identify it later"
              placement="top"
              arrow
            >
              <TextField
                label="Form Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
            </Tooltip>
            <Tooltip
              title="Specify the source of the lead"
              placement="top"
              arrow
            >
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Lead Source</InputLabel>
                <Select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value as string)}
                  label="Lead Source"
                >
                  {LEAD_SOURCES.map((source) => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Tooltip>
            <Tooltip
              title="Select the industry or niche for your form"
              placement="top"
              arrow
            >
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Industry/Niche</InputLabel>
                <Select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as string)}
                  label="Industry/Niche"
                >
                  {industryNiches.map((ind) => (
                    <MenuItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Tooltip>
            <Tooltip
              title={
                status === "published"
                  ? "Live — currently accepting submissions"
                  : "Draft — won't accept submissions until published"
              }
              placement="top"
              arrow
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={status === "published"}
                    onChange={(e) =>
                      setStatus(e.target.checked ? "published" : "draft")
                    }
                    color="primary"
                  />
                }
                label={status === "published" ? "Published" : "Draft"}
                sx={{ mb: 1 }}
              />
            </Tooltip>
            <Tooltip
              title="Optional — leave blank to accept submissions from anywhere. List the domain(s) where you'll embed this form (e.g. example.com) to reject submissions from anywhere else."
              placement="top"
              arrow
            >
              <TextField
                label="Allowed Domains (optional)"
                value={allowedOriginsInput}
                onChange={(e) => setAllowedOriginsInput(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                placeholder="example.com, www.example.com"
              />
            </Tooltip>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, mt: 2 }}
            >
              Add Fields
            </Typography>
            <Tooltip
              title="Enter a custom label for your field (e.g., 'Full Name', 'Company Email')"
              placement="top"
              arrow
            >
              <TextField
                label="Field Label"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                placeholder="Enter field label..."
              />
            </Tooltip>
            <Tooltip
              title="Add a heading block to separate sections"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("header")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Header
              </Button>
            </Tooltip>
            <Tooltip
              title="Add a paragraph block for helper or intro text"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("paragraph")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Paragraph
              </Button>
            </Tooltip>
            <Tooltip
              title="Add preconfigured contact fields (Name, Email, Phone) for lead collection"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={addLeadContactFields}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Contact Fields
              </Button>
            </Tooltip>
            <Tooltip
              title="Add a single-line text input field"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("text")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Text Field
              </Button>
            </Tooltip>
            <Tooltip
              title="Add a multi-line text area for longer responses"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("textarea")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Text Area
              </Button>
            </Tooltip>
            <Tooltip
              title="Add an email input field with validation"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("email")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Email
              </Button>
            </Tooltip>
            <Tooltip
              title="Add a phone number input field"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("tel")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Phone
              </Button>
            </Tooltip>
            <Tooltip title="Add a number input field" placement="top" arrow>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("number")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Number
              </Button>
            </Tooltip>
            <Tooltip title="Add a date picker field" placement="top" arrow>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("date")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Date
              </Button>
            </Tooltip>
            <Tooltip title="Add a URL input field" placement="top" arrow>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("url")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                URL
              </Button>
            </Tooltip>
            <Tooltip
              title="Add a dropdown menu with custom options"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("dropdown")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Dropdown
              </Button>
            </Tooltip>
            <Tooltip
              title="Add radio buttons for single selection"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("radio")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Radio Button
              </Button>
            </Tooltip>
            <Tooltip
              title="Add checkboxes for multiple selections"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("checkbox")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Checkbox
              </Button>
            </Tooltip>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <FormPreview
            fields={fields}
            formId={"Null"}
            isLoggedIn={true}
            onEdit={startEditing}
            onDelete={deleteField}
            onToggleRequired={toggleRequired}
            onReorder={setFields}
            loading={false}
          />
          {editingFieldId && (
            <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
              >
                Edit Field
              </Typography>
              <TextField
                label="Field Label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
              {isOptionsField(
                fields.find((field) => field.id === editingFieldId)?.type,
              ) && (
                <div>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Options:
                  </Typography>
                  {editOptions.map((option, i) => (
                    <TextField
                      key={i}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editOptions];
                        newOptions[i] = e.target.value;
                        setEditOptions(newOptions);
                      }}
                      fullWidth
                      sx={{ mb: 1 }}
                    />
                  ))}
                  <Button
                    onClick={() => setEditOptions([...editOptions, ""])}
                    startIcon={<AddIcon />}
                    size="small"
                  >
                    Add Option
                  </Button>
                </div>
              )}
              {fields.find((field) => field.id === editingFieldId)?.type ===
                "header" && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Heading Level</InputLabel>
                  <Select
                    label="Heading Level"
                    value={editHeadingLevel}
                    onChange={(e) =>
                      setEditHeadingLevel(
                        (e.target.value || "h2") as
                          | "h1"
                          | "h2"
                          | "h3"
                          | "h4"
                          | "h5"
                          | "h6",
                      )
                    }
                  >
                    <MenuItem value="h1">H1</MenuItem>
                    <MenuItem value="h2">H2</MenuItem>
                    <MenuItem value="h3">H3</MenuItem>
                    <MenuItem value="h4">H4</MenuItem>
                    <MenuItem value="h5">H5</MenuItem>
                    <MenuItem value="h6">H6</MenuItem>
                  </Select>
                </FormControl>
              )}
              <Box sx={{ mt: 2 }}>
                <Button
                  onClick={saveFieldChanges}
                  variant="contained"
                  size="small"
                  sx={{ mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setEditingFieldId(null);
                    setEditLabel("");
                    setEditOptions([]);
                    setEditHeadingLevel("h2");
                  }}
                  variant="outlined"
                  size="small"
                >
                  Cancel
                </Button>
              </Box>
            </Paper>
          )}
          <Button
            variant="contained"
            color="primary"
            disabled={isUpdating}
            onClick={handleUpdate}
            sx={{ mt: 2, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
          >
            {isUpdating ? "Updating Form..." : "Update Form"}
          </Button>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
