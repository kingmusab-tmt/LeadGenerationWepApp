"use client";
import { useState } from "react";
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
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import dynamic from "next/dynamic";

const FormPreview = dynamic(() => import("./FormPreview"), { ssr: false });

import { industryNiches } from "@/utils/industryNiches";
import { LEAD_SOURCES } from "@/utils/leadSources";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useSubscriptionLimits } from "@/app/hooks/useSubscriptionLimits";

interface Field {
  id: string;
  type: string;
  label: string; // This will store the custom label for the field
  required?: boolean;
  options?: string[];
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  disabled?: boolean;
  linkedTo?: string; // ID of the field this is linked to (e.g., state linked to city)
}

const FormBuilder = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>("");
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const { limits } = useSubscriptionLimits();
  const [editHeadingLevel, setEditHeadingLevel] = useState<
    "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  >("h2");
  const [formName, setFormName] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [newFieldLabel, setNewFieldLabel] = useState<string>(""); // State for the custom label input
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Style Configuration State
  const [primaryColor, setPrimaryColor] = useState<string>("#1976d2");
  const [buttonText, setButtonText] = useState<string>("Submit");
  const [successMessage, setSuccessMessage] = useState<string>(
    "Thank you! Your form has been submitted successfully.",
  );
  const [formBackgroundColor, setFormBackgroundColor] =
    useState<string>("#ffffff");
  const [recaptchaEnabled, setRecaptchaEnabled] = useState<boolean>(false);

  // AI Generation State
  const [aiDialogOpen, setAiDialogOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Add a new field with a custom label
  const addField = (type: string, defaultLabel: string) => {
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
      label: newFieldLabel, // Use the custom label provided by the user
      required: false,
      options:
        type === "select" || type === "radio" || type === "checkbox"
          ? []
          : undefined,
      headingLevel: type === "header" ? "h2" : undefined,
    };
    setFields([...fields, newField]);
    setNewFieldLabel(""); // Reset the label input after adding the field
  };

  // Add lead contact fields
  const addLeadContactFields = () => {
    const cityFieldId = Math.random().toString();
    const stateFieldId = Math.random().toString();
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
        type: "phone",
        label: "Phone",
        required: false,
      },
      {
        id: cityFieldId,
        type: "city_autocomplete",
        label: "City",
        required: false,
        linkedTo: stateFieldId, // Link city to state for auto-population
      },
      {
        id: stateFieldId,
        type: "state_auto",
        label: "State",
        required: false,
        disabled: true,
        linkedTo: cityFieldId, // This state field is linked to the city field
      },
      {
        id: Math.random().toString(),
        type: "text",
        label: "Postcode",
        required: false,
      },
    ];
    setFields([...fields, ...contactFields]);
  };

  // Delete a field
  const deleteField = (id: string) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  // Edit the label of a field
  const handleEditLabel = (id: string, label: string) => {
    setFields(
      fields.map((field) => (field.id === id ? { ...field, label } : field)),
    );
    setEditingFieldId(null); // Close the edit form
    setEditLabel(""); // Reset the edit label
  };

  // Edit the options of a field
  const handleEditOptions = (id: string, options: string[]) => {
    setFields(
      fields.map((field) => (field.id === id ? { ...field, options } : field)),
    );
    setEditOptions([]); // Reset the edit options
  };

  // Toggle the required status of a field
  const toggleRequired = (id: string) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, required: !field.required } : field,
      ),
    );
  };

  // Handle AI Form Generation
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter a description of the leads you want to capture.",
        severity: "error",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/form/generate-with-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate form with AI");
      }

      if (result.success && result.data) {
        const {
          formName: generatedFormName,
          description,
          fields: generatedFields,
        } = result.data;

        // Set form name and description
        setFormName(generatedFormName || "");
        setLeadSource(description || "");

        // Convert generated fields to our Field format
        const aiFields: Field[] = (generatedFields || []).map(
          (field: any, index: number) => ({
            id: Math.random().toString(),
            type: field.type || "text",
            label: field.label || field.name || `Field ${index + 1}`,
            required: field.required || false,
            options: field.options || undefined,
          }),
        );

        setFields(aiFields);
        setAiPrompt("");
        setAiDialogOpen(false);

        setSnackbar({
          open: true,
          message:
            "Form generated successfully! You can now edit and customize it.",
          severity: "success",
        });
      } else {
        throw new Error("Invalid response format from AI generation");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate form with AI",
        severity: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish the form
  const handlePublish = async () => {
    if (fields.length === 0) {
      setSnackbar({
        open: true,
        message: "Please add at least one field before publishing.",
        severity: "error",
      });
      return;
    }
    setIsPublishing(true);
    try {
      // Map field types to match backend validation
      const mappedFields = fields.map((field) => ({
        ...field,
        type:
          field.type === "dropdown"
            ? "select"
            : field.type === "tel"
              ? "phone"
              : field.type,
      }));

      const response = await fetch("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: leadSource
            ? `Lead Source: ${leadSource} | Industry: ${industry}`
            : undefined,
          fields: mappedFields,
          recaptchaEnabled,
          styleConfig: {
            primaryColor,
            buttonText,
            successMessage,
            formBackgroundColor,
          },
        }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSnackbar({
          open: true,
          message: result.data?.message || "Form published successfully!",
          severity: "success",
        });

        // Clear the form
        setFields([]);
        setFormName("");
        setLeadSource("");
        setIndustry("");
        setNewFieldLabel("");
        setPrimaryColor("#1976d2");
        setButtonText("Submit");
        setSuccessMessage(
          "Thank you! Your form has been submitted successfully.",
        );
        setFormBackgroundColor("#ffffff");
        setRecaptchaEnabled(false);

        // Redirect to forms page
        router.push("/dashboard/seller/lead_management/forms");
      } else {
        let errorMessage = "Failed to publish.";
        if (result.duplicate) {
          errorMessage = `Failed to publish. Duplicate or Existing Form Name or Industry: ${result.duplicate}.`;
        } else if (result.details && typeof result.details === "object") {
          // Extract validation errors from details
          const errors = Object.entries(result.details)
            .map(([field, messages]) => {
              const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
              const errorList = Array.isArray(messages) ? messages : [messages];
              return `${fieldName}: ${errorList.join(", ")}`;
            })
            .join(". ");
          errorMessage = `Validation failed: ${errors}`;
        } else if (result.error) {
          errorMessage = result.error;
        }
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to publish. Please try again.`,
        severity: "error",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Start editing a field
  const startEditing = (id: string) => {
    const field = fields.find((field) => field.id === id);
    if (field) {
      setEditingFieldId(id);
      setEditLabel(field.label); // Initialize editLabel with the current label
      setEditOptions(field.options || []); // Initialize editOptions if applicable
      setEditHeadingLevel(field.headingLevel || "h2");
    }
  };

  // Save changes to the field being edited
  const saveFieldChanges = () => {
    if (editingFieldId) {
      handleEditLabel(editingFieldId, editLabel); // Update the label
      if (
        fields.find((field) => field.id === editingFieldId)?.type ===
          "checkbox" ||
        fields.find((field) => field.id === editingFieldId)?.type === "radio" ||
        fields.find((field) => field.id === editingFieldId)?.type === "select"
      ) {
        handleEditOptions(editingFieldId, editOptions); // Update the options
      }
      if (
        fields.find((field) => field.id === editingFieldId)?.type === "header"
      ) {
        setFields((prev) =>
          prev.map((field) =>
            field.id === editingFieldId
              ? { ...field, headingLevel: editHeadingLevel }
              : field,
          ),
        );
      }
      setEditingFieldId(null); // Close the edit form
      setEditLabel(""); // Reset the edit label
      setEditOptions([]); // Reset the edit options
      setEditHeadingLevel("h2");
    }
  };

  return (
    <Container sx={{ padding: { xs: 1, sm: 2 } }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: "bold",
          color: "primary.main",
        }}
      >
        Form Builder
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure form details on the left, preview in the center, and add
        fields from the right.
      </Typography>
      <Grid container spacing={1.5}>
        {/* LEFT COLUMN: Form Details & Style Configuration */}
        <Grid size={{ xs: 12, md: 2 }}>
          <Paper
            elevation={2}
            sx={{ p: 1, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}
          >
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 600, fontSize: "0.8rem" }}
            >
              Form Details
            </Typography>
            <Tooltip
              title="Provide a name for your form to identify it later"
              placement="right"
              arrow
            >
              <TextField
                label="Form Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1, "& .MuiInputBase-input": { fontSize: "0.8rem" } }}
              />
            </Tooltip>
            <Tooltip
              title="Specify the source of the lead"
              placement="right"
              arrow
            >
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel sx={{ fontSize: "0.8rem" }}>Lead Source</InputLabel>
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
              placement="right"
              arrow
            >
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel sx={{ fontSize: "0.8rem" }}>Industry</InputLabel>
                <Select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as string)}
                  label="Industry"
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
              variant="caption"
              gutterBottom
              sx={{
                fontWeight: 600,
                mt: 1.5,
                mb: 0.5,
                display: "block",
                fontSize: "0.75rem",
              }}
            >
              Style
            </Typography>
            <Tooltip
              title="Choose the primary color for buttons and accents"
              placement="right"
              arrow
            >
              <Box
                sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                  Primary:
                </Typography>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: "28px",
                    height: "22px",
                    border: "1px solid #ccc",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                />
              </Box>
            </Tooltip>
            <Tooltip
              title="Customize the background color of the form"
              placement="right"
              arrow
            >
              <Box
                sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                  BG:
                </Typography>
                <input
                  type="color"
                  value={formBackgroundColor}
                  onChange={(e) => setFormBackgroundColor(e.target.value)}
                  style={{
                    width: "28px",
                    height: "22px",
                    border: "1px solid #ccc",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                />
              </Box>
            </Tooltip>
            <Tooltip
              title="Set the text label for the submit button"
              placement="right"
              arrow
            >
              <TextField
                label="Button Text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1, "& .MuiInputBase-input": { fontSize: "0.8rem" } }}
                placeholder="Submit"
              />
            </Tooltip>
            <Tooltip
              title="Enter the success message shown after form submission"
              placement="right"
              arrow
            >
              <TextField
                label="Success Msg"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1, "& .MuiInputBase-input": { fontSize: "0.8rem" } }}
                multiline
                rows={2}
                placeholder="Thank you!"
              />
            </Tooltip>
            <FormControlLabel
              control={
                <Switch
                  checked={recaptchaEnabled}
                  onChange={(e) => setRecaptchaEnabled(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label="reCAPTCHA"
              sx={{ mb: 0.5 }}
              slotProps={{
                typography: { variant: "caption", sx: { fontSize: "0.7rem" } },
              }}
            />
          </Paper>
        </Grid>

        {/* MIDDLE COLUMN: Form Preview */}
        <Grid size={{ xs: 12, md: 8 }}>
          <FormPreview
            fields={fields}
            userId={"Null"}
            formId={"Null"}
            isLoggedIn={true}
            onEdit={startEditing}
            onDelete={deleteField}
            onToggleRequired={toggleRequired}
            onReorder={setFields}
            onSubmit={function (formData: {
              [key: string]: any;
            }): Promise<void> {
              throw new Error("Function not implemented.");
            }}
            errors={{}}
            loading={false}
            styleConfig={{
              primaryColor,
              buttonText,
              successMessage,
              formBackgroundColor,
            }}
            recaptchaEnabled={recaptchaEnabled}
          />
          {editingFieldId && (
            <Paper elevation={2} sx={{ p: 1.5, mt: 2 }}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Edit Field
              </Typography>
              <TextField
                label="Field Label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
              />
              {(fields.find((field) => field.id === editingFieldId)?.type ===
                "checkbox" ||
                fields.find((field) => field.id === editingFieldId)?.type ===
                  "radio" ||
                fields.find((field) => field.id === editingFieldId)?.type ===
                  "select") && (
                <div>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
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
                      size="small"
                      sx={{ mb: 0.5 }}
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
                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
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
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  onClick={saveFieldChanges}
                  size="small"
                  variant="contained"
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
                  size="small"
                >
                  Cancel
                </Button>
              </Box>
            </Paper>
          )}
          <Box
            sx={{
              mt: 2,
              display: "flex",
              gap: 2,
              justifyContent: "space-between",
            }}
          >
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={async () => {
                const confirmed = await confirm({
                  title: "Clear Form",
                  message:
                    "Are you sure you want to clear all fields? This cannot be undone.",
                  confirmText: "Clear All",
                  confirmColor: "error",
                });
                if (confirmed) {
                  setFields([]);
                  setFormName("");
                  setLeadSource("");
                  setIndustry("");
                  setNewFieldLabel("");
                  setPrimaryColor("#1976d2");
                  setButtonText("Submit");
                  setSuccessMessage(
                    "Thank you! Your form has been submitted successfully.",
                  );
                  setFormBackgroundColor("#ffffff");
                  setRecaptchaEnabled(false);
                  setSnackbar({
                    open: true,
                    message: "Form cleared successfully",
                    severity: "success",
                  });
                }
              }}
            >
              Clear Form
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={isPublishing}
              onClick={handlePublish}
            >
              {isPublishing ? "Publishing..." : "Publish Form"}
            </Button>
          </Box>
        </Grid>

        {/* RIGHT COLUMN: Add Fields */}
        <Grid size={{ xs: 12, md: 2 }}>
          <Paper
            elevation={2}
            sx={{ p: 1, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}
          >
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 600, fontSize: "0.8rem" }}
            >
              Add Fields
            </Typography>
            {/* Input for custom label */}
            <TextField
              label="Field Label"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1, "& .MuiInputBase-input": { fontSize: "0.8rem" } }}
            />

            <Tooltip
              title="Add a heading block to separate sections"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("header", "Section Header")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Header
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a paragraph block for helper or intro text"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("paragraph", "Paragraph text")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Paragraph
              </Button>
            </Tooltip>

            <Tooltip
              title="Add preconfigured contact fields (Name, Email, Phone) for lead collection"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={addLeadContactFields}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Contact Fields
              </Button>
            </Tooltip>

            {limits?.aiGenerativeEnabled && (
              <Tooltip
                title="Use AI to automatically generate form fields based on your requirements"
                placement="left"
                arrow
              >
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  onClick={() => setAiDialogOpen(true)}
                  startIcon={<AutoFixHighIcon sx={{ fontSize: "0.85rem" }} />}
                  sx={{
                    mb: 1,
                    fontSize: "0.7rem",
                    py: 0.5,
                    backgroundColor: "#9c27b0",
                    "&:hover": { backgroundColor: "#7b1fa2" },
                  }}
                >
                  AI Generate
                </Button>
              </Tooltip>
            )}

            <Tooltip
              title="Add a single-line text input field for short text responses"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("text", "Text Input")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Text
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a multi-line textarea field for longer text responses"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("textarea", "Long Text / Textarea")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Textarea
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a dropdown select field with predefined options"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("select", "Dropdown")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Dropdown
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a checkbox field for yes/no or multiple selection options"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("checkbox", "Checkbox")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Checkbox
              </Button>
            </Tooltip>

            <Tooltip
              title="Add radio buttons for single selection from multiple options"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("radio", "Radio Button")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Radio
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a number input field for numeric values"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("number", "Number Input")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Number
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a date picker field for date selection"
              placement="left"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => addField("date", "Date Picker")}
                sx={{ mb: 0.5, fontSize: "0.7rem", py: 0.5 }}
              >
                Date
              </Button>
            </Tooltip>
          </Paper>
        </Grid>
      </Grid>

      {/* AI Form Generation Dialog */}
      <Dialog
        open={aiDialogOpen}
        onClose={() => {
          if (!isGenerating) {
            setAiDialogOpen(false);
            setAiPrompt("");
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoFixHighIcon sx={{ color: "#9c27b0" }} />
          Generate Form with AI
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            multiline
            rows={5}
            fullWidth
            label="Describe the leads you want to capture"
            placeholder="Example: I need to capture home renovation leads with information about their project type, budget, timeline, property location, and contact details."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            disabled={isGenerating}
            sx={{ mb: 2 }}
            helperText="Describe the type of leads and fields you need. The AI will generate a form structure for you."
          />
          {isGenerating && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={24} />
              <Typography variant="body2">Generating your form...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAiDialogOpen(false);
              setAiPrompt("");
            }}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAIGenerate}
            variant="contained"
            sx={{ backgroundColor: "#9c27b0" }}
            disabled={isGenerating || !aiPrompt.trim()}
          >
            {isGenerating ? "Generating..." : "Generate Form"}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message || ""}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Container>
  );
};

export default FormBuilder;
