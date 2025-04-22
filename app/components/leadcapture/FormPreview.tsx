"use client";
import { useState } from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Paper,
  Typography,
  IconButton,
  Menu,
  TextareaAutosize,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  FormGroup,
  InputLabel,
  Snackbar,
  Grid,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

interface Field {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
  description?: string; // Added for file upload description
}

interface FormPreviewProps {
  fields: Field[];
  userId: string;
  formId: string;
  isLoggedIn: boolean; // New prop to check if the user is logged in
  onEdit?: (id: string) => void;
  onSubmit: (formData: { [key: string]: any }) => Promise<void>;
  onDelete?: (id: string) => void;
  errors: { [key: string]: string };
  onToggleRequired?: (id: string) => void;
  loading: boolean;
}

const FormPreview = ({
  fields,
  userId,
  formId,
  isLoggedIn, // Destructure the new prop
  onEdit = () => {},
  onDelete = () => {},
  onToggleRequired = () => {},
}: FormPreviewProps) => {
  const [formData, setFormData] = useState<
    Record<string, { id: string; value: string | boolean | string[] }>
  >({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const handleClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setCurrentFieldId(id);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentFieldId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.id]?.value) {
        alert(`Field "${field.label}" is required.`);
        return;
      }
    }

    const submissionData = {
      userId,
      formId,
      fields: fields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formData[field.id]?.value || "",
      })),
    };

    try {
      const response = await fetch("/api/form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (result.success) {
        setSnackbarMessage(result.message);
        setSnackbarOpen(true);
        setFormData({}); // Reset form state
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleChange = (id: string, value: string | boolean | string[]) => {
    setFormData({ ...formData, [id]: { id, value } });
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Form Preview
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {fields.map((field) => (
            <Grid item xs={12} sm={6} key={field.id}>
              <div
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  {/* Text Field */}
                  {field.type === "text" && (
                    <TextField
                      label={field.label}
                      fullWidth
                      value={(formData[field.id]?.value as string) || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}

                  {/* Textarea Field */}
                  {field.type === "textarea" && (
                    <TextareaAutosize
                      minRows={4}
                      placeholder={field.label}
                      style={{ width: "100%" }}
                      value={(formData[field.id]?.value as string) || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}

                  {/* Dropdown Field */}
                  {field.type === "dropdown" && (
                    <FormControl fullWidth>
                      <InputLabel>{field.label}</InputLabel>
                      <Select
                        label={field.label}
                        value={(formData[field.id]?.value as string) || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        required={field.required}
                      >
                        {field.options?.map((option, index) => (
                          <MenuItem key={index} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {/* File Upload Field */}
                  {field.type === "file" && (
                    <div>
                      <Typography variant="body1" gutterBottom>
                        {field.description || field.label}
                      </Typography>
                      <input
                        type="file"
                        onChange={(e) =>
                          handleChange(
                            field.id,
                            e.target.files?.[0]?.name || ""
                          )
                        }
                      />
                    </div>
                  )}

                  {/* Email Field */}
                  {field.type === "email" && (
                    <TextField
                      label={field.label}
                      type="email"
                      fullWidth
                      value={(formData[field.id]?.value as string) || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}

                  {/* Phone Field */}
                  {field.type === "tel" && (
                    <TextField
                      label={field.label}
                      type="tel"
                      fullWidth
                      value={(formData[field.id]?.value as string) || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}
                  {field.type === "checkbox" && (
                    <FormControl component="fieldset">
                      <FormLabel component="legend">{field.label}</FormLabel>
                      <FormGroup>
                        {field.options?.map((option, index) => (
                          <FormControlLabel
                            key={index}
                            control={
                              <Checkbox
                                checked={
                                  (
                                    formData[field.id]?.value as string[]
                                  )?.includes(option) || false
                                }
                                onChange={(e) => {
                                  const currentValues =
                                    (formData[field.id]?.value as string[]) ||
                                    [];
                                  const newValues = e.target.checked
                                    ? [...currentValues, option]
                                    : currentValues.filter((v) => v !== option);
                                  handleChange(field.id, newValues);
                                }}
                              />
                            }
                            label={option}
                          />
                        ))}
                      </FormGroup>
                    </FormControl>
                  )}

                  {field.type === "radio" && (
                    <FormControl component="fieldset">
                      <FormLabel component="legend">{field.label}</FormLabel>
                      <RadioGroup
                        value={(formData[field.id]?.value as string) || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                      >
                        {field.options?.map((option, index) => (
                          <FormControlLabel
                            key={index}
                            value={option}
                            control={<Radio />}
                            label={option}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  )}
                </div>

                {/* Show the three-dot menu only if the user is logged in */}
                {isLoggedIn && onEdit && onDelete && onToggleRequired && (
                  <>
                    <IconButton
                      onClick={(e) => handleClick(e, field.id)}
                      size="small"
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl) && currentFieldId === field.id}
                      onClose={handleClose}
                    >
                      <MenuItem
                        onClick={() => {
                          onEdit(field.id);
                          handleClose();
                        }}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          onToggleRequired(field.id);
                          handleClose();
                        }}
                      >
                        {field.required
                          ? "Mark as Optional"
                          : "Mark as Required"}
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          onDelete(field.id);
                          handleClose();
                        }}
                        sx={{ color: "error.main" }}
                      >
                        Delete
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </div>
            </Grid>
          ))}
        </Grid>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          Submit
        </Button>
      </form>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Paper>
  );
};

export default FormPreview;
