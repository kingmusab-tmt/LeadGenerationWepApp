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
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FormPreview from "./FormPreview";
import { industryNiches } from "@/utils/industryNiches";
import { usCities } from "@/utils/citiesInUsUk";
import { useRouter } from "next/navigation";

interface Field {
  id: string;
  type: string;
  label: string; // This will store the custom label for the field
  required?: boolean;
  options?: string[];
}

const FormBuilder = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>("");
  const [editOptions, setEditOptions] = useState<string[]>([]);
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
        type === "dropdown" || type === "radio" || type === "checkbox"
          ? []
          : undefined,
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
        type: "tel",
        label: "Phone",
        required: false,
      },
      {
        id: Math.random().toString(),
        type: "dropdown",
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
      fields.map((field) => (field.id === id ? { ...field, label } : field))
    );
    setEditingFieldId(null); // Close the edit form
    setEditLabel(""); // Reset the edit label
  };

  // Edit the options of a field
  const handleEditOptions = (id: string, options: string[]) => {
    setFields(
      fields.map((field) => (field.id === id ? { ...field, options } : field))
    );
    setEditOptions([]); // Reset the edit options
  };

  // Toggle the required status of a field
  const toggleRequired = (id: string) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, required: !field.required } : field
      )
    );
  };

  // Publish the form
  const handlePublish = async () => {
    console.log("Starting handlePublish...");
    if (fields.length === 0) {
      setSnackbar({
        open: true,
        message: "Please add at least one field before publishing.",
        severity: "error",
      });
      return;
    }
    console.log("Passed filed check...");
    setIsPublishing(true);
    try {
      console.log("inside try and catch...");
      const response = await fetch("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formName,
          leadSource,
          industry,
          fields,
        }),
      });
      const result = await response.json();
      console.log(result);

      if (result.status === 200) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: "success",
        });
        router.push("/dashboard/seller/lead_management/forms");
      } else {
        let errorMessage = "Failed to publish.";
        if (result.duplicate) {
          errorMessage = `Failed to publish. Duplicate or Existing Form Name or Industry: ${result.duplicate}.`;
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
        fields.find((field) => field.id === editingFieldId)?.type === "dropdown"
      ) {
        handleEditOptions(editingFieldId, editOptions); // Update the options
      }
      setEditingFieldId(null); // Close the edit form
      setEditLabel(""); // Reset the edit label
      setEditOptions([]); // Reset the edit options
    }
  };

  return (
    <Container sx={{ padding: { xs: 1, sm: 2 } }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
      >
        Lead Generation Form Builder
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              Form Details
            </Typography>
            <TextField
              label="Form Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Lead Source"
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
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
            <Button
              variant="outlined"
              fullWidth
              onClick={() => addField("text", "Text Input")}
              sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Text Input
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => addField("textarea", "Long Text / Textarea")}
              sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Long Text / Textarea
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => addField("dropdown", "Dropdown")}
              sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Dropdown
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => addField("checkbox", "Checkbox")}
              sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Checkbox
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => addField("radio", "Radio Button")}
              sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Radio Button
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => addField("file", "File Upload")}
              sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              File Upload
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={addLeadContactFields}
              sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Lead Contact
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={8}>
          <FormPreview
            fields={fields}
            userId={"Null"}
            formId={"Null"}
            isLoggedIn={true} // Pass whether the user is logged in
            onEdit={startEditing} // Use startEditing to initialize edit states
            onDelete={deleteField}
            onToggleRequired={toggleRequired}
            onSubmit={function (formData: {
              [key: string]: any;
            }): Promise<void> {
              throw new Error("Function not implemented.");
            }}
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
              {/* Show options editor for Checkbox, Radio Button, and Dropdown */}
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
              <Button onClick={saveFieldChanges} size="small">
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditingFieldId(null);
                  setEditLabel("");
                  setEditOptions([]);
                }}
                size="small"
              >
                Cancel
              </Button>
            </Paper>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handlePublish}
            sx={{ mt: 2, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
          >
            Publish Form
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
    </Container>
  );
};

export default FormBuilder;
