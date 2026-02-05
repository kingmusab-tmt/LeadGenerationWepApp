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
import FormPreview from "./FormPreview";
import { industryNiches } from "@/utils/industryNiches";
import { usCities } from "@/utils/citiesInUsUk";
import { LEAD_SOURCES } from "@/utils/leadSources";
import { useRouter } from "next/navigation";

interface Field {
  id: string;
  type: string;
  label: string; // This will store the custom label for the field
  required?: boolean;
  options?: string[];
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const FormBuilder = () => {
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
        id: Math.random().toString(),
        type: "select",
        label: "City",
        required: false,
        options: usCities, // Use imported city list for dropdown options
      },
      {
        id: Math.random().toString(),
        type: "text",
        label: "Address",
        required: false,
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
        variant="h4"
        gutterBottom
        sx={{
          fontSize: { xs: "1.5rem", sm: "2rem" },
          fontWeight: "bold",
          color: "primary.main",
        }}
      >
        Form Builder
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Add field Label and click the field to Create your custom form. Preview
        your form in real-time.
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
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, mt: 3 }}
            >
              Style Configuration
            </Typography>
            <Tooltip
              title="Choose the primary color for buttons and accents"
              placement="top"
              arrow
            >
              <Box
                sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
              >
                <Typography variant="body2">Primary Color:</Typography>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: "50px",
                    height: "40px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
                <Typography variant="caption" color="textSecondary">
                  {primaryColor}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip
              title="Customize the background color of the form"
              placement="top"
              arrow
            >
              <Box
                sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
              >
                <Typography variant="body2">Form Background:</Typography>
                <input
                  type="color"
                  value={formBackgroundColor}
                  onChange={(e) => setFormBackgroundColor(e.target.value)}
                  style={{
                    width: "50px",
                    height: "40px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
                <Typography variant="caption" color="textSecondary">
                  {formBackgroundColor}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip
              title="Set the text label for the submit button"
              placement="top"
              arrow
            >
              <TextField
                label="Submit Button Text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                placeholder="Submit"
              />
            </Tooltip>
            <Tooltip
              title="Enter the success message shown after form submission"
              placement="top"
              arrow
            >
              <TextField
                label="Success Message"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                multiline
                rows={2}
                placeholder="Thank you! Your form has been submitted successfully."
              />
            </Tooltip>
            <FormControlLabel
              control={
                <Switch
                  checked={recaptchaEnabled}
                  onChange={(e) => setRecaptchaEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Enable Google reCAPTCHA"
              sx={{ mb: 3 }}
            />
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              Add Fields
            </Typography>
            {/* Input for custom label */}
            <TextField
              label="Field Label"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Tooltip
              title="Add a heading block to separate sections"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("header", "Section Header")}
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
                onClick={() => addField("paragraph", "Paragraph text")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Paragraph
              </Button>
            </Tooltip>
            {/* Field Type Buttons with Tooltips */}
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
              title="Use AI to automatically generate form fields based on your requirements"
              placement="top"
              arrow
            >
              <Button
                variant="contained"
                fullWidth
                onClick={() => setAiDialogOpen(true)}
                startIcon={<AutoFixHighIcon />}
                sx={{
                  mb: 2,
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  backgroundColor: "#9c27b0",
                  "&:hover": { backgroundColor: "#7b1fa2" },
                }}
              >
                Generate with AI
              </Button>
            </Tooltip>
            <Tooltip
              title="Add a single-line text input field for short text responses"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("text", "Text Input")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Text Input
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a multi-line textarea field for longer text responses"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("textarea", "Long Text / Textarea")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Long Text / Textarea
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a dropdown select field with predefined options"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("select", "Dropdown")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Dropdown List
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a checkbox field for yes/no or multiple selection options"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("checkbox", "Checkbox")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Multiple Choice Field
              </Button>
            </Tooltip>

            <Tooltip
              title="Add radio buttons for single selection from multiple options"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("radio", "Radio Button")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Single Choice Field
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a number input field for numeric values"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("number", "Number Input")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Number Input
              </Button>
            </Tooltip>

            <Tooltip
              title="Add a date picker field for date selection"
              placement="top"
              arrow
            >
              <Button
                variant="outlined"
                fullWidth
                onClick={() => addField("date", "Date Picker")}
                sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
              >
                Date Picker
              </Button>
            </Tooltip>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <FormPreview
            fields={fields}
            userId={"Null"}
            formId={"Null"}
            isLoggedIn={true} // Pass whether the user is logged in
            onEdit={startEditing} // Use startEditing to initialize edit states
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
              {/* Show options editor for Checkbox, Radio Button, and Dropdown */}
              {(fields.find((field) => field.id === editingFieldId)?.type ===
                "checkbox" ||
                fields.find((field) => field.id === editingFieldId)?.type ===
                  "radio" ||
                fields.find((field) => field.id === editingFieldId)?.type ===
                  "select") && (
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
                <FormControl fullWidth sx={{ mb: 2 }}>
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
              <Button onClick={saveFieldChanges} size="small">
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
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to clear all fields? This cannot be undone.",
                  )
                ) {
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
              sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Clear Form
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={isPublishing}
              onClick={handlePublish}
              sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              {isPublishing ? "Publishing Your Form" : "Publish Form"}
            </Button>
          </Box>
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
    </Container>
  );
};

export default FormBuilder;
