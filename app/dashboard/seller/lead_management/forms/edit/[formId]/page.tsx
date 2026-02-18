"use client";
import { useState, useEffect } from "react";
import {
  Button,
  Container,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FormPreview from "@/app/components/leadcapture/FormPreview";
import { industryNiches } from "@/utils/industryNiches";
import { usCities } from "@/utils/citiesInUsUk";
import { LEAD_SOURCES } from "@/utils/leadSources";
import { useRouter, useParams } from "next/navigation";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface Field {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
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
  const [formName, setFormName] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [newFieldLabel, setNewFieldLabel] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

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

        // Parse leadSource and industry from description
        if (data.description) {
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
        } else {
          setLeadSource(data.leadSource || "");
          setIndustry(data.industry || "");
        }
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
      id: Math.random().toString(),
      type,
      label: newFieldLabel,
      required: false,
      options:
        type === "dropdown" || type === "radio" || type === "checkbox"
          ? []
          : undefined,
    };
    setFields([...fields, newField]);
    setNewFieldLabel("");
  };

  // Add lead contact fields
  const addLeadContactFields = () => {
    const contactFields: Field[] = [
      {
        id: Math.random().toString(),
        type: "text",
        label: "Name",
        required: false,
      },
      {
        id: Math.random().toString(),
        type: "email",
        label: "Email",
        required: false,
      },
      {
        id: Math.random().toString(),
        type: "tel",
        label: "Phone",
        required: false,
      },
      {
        id: Math.random().toString(),
        type: "dropdown",
        label: "City",
        required: false,
        options: usCities,
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
    }
  };

  // Save changes to the field being edited
  const saveFieldChanges = () => {
    if (editingFieldId) {
      handleEditLabel(editingFieldId, editLabel);
      if (
        fields.find((field) => field.id === editingFieldId)?.type ===
          "checkbox" ||
        fields.find((field) => field.id === editingFieldId)?.type === "radio" ||
        fields.find((field) => field.id === editingFieldId)?.type === "dropdown"
      ) {
        handleEditOptions(editingFieldId, editOptions);
      }
      setEditingFieldId(null);
      setEditLabel("");
      setEditOptions([]);
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

    setIsUpdating(true);

    try {
      const response = await fetchWithCSRF("/api/form/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId,
          fields,
          formName,
          leadSource,
          industry,
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
            userId={"Null"}
            formId={"Null"}
            isLoggedIn={true}
            onEdit={startEditing}
            onDelete={deleteField}
            onToggleRequired={toggleRequired}
            onSubmit={async () => {}}
            errors={{}}
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
              {(fields.find((field) => field.id === editingFieldId)?.type ===
                "checkbox" ||
                fields.find((field) => field.id === editingFieldId)?.type ===
                  "radio" ||
                fields.find((field) => field.id === editingFieldId)?.type ===
                  "dropdown") && (
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
