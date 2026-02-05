"use client";
import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
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
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  FormGroup,
  InputLabel,
  Snackbar,
  Alert,
  LinearProgress,
  Chip,
  Box,
  InputAdornment,
  FormHelperText,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// Declare grecaptcha for TypeScript
declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface Field {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  description?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  helperText?: string;
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

interface SortableFieldItemProps {
  field: Field;
  isLoggedIn: boolean;
  children: React.ReactNode;
}

const SortableFieldItem = ({
  field,
  isLoggedIn,
  children,
}: SortableFieldItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Grid
      size={{
        xs: 12,
        sm:
          field.type === "textarea" ||
          field.type === "header" ||
          field.type === "paragraph"
            ? 12
            : 6,
      }}
      key={field.id}
      ref={setNodeRef}
      style={style}
    >
      <Box
        sx={{
          mb: { xs: 1, sm: 2 },
          display: "flex",
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        {isLoggedIn && (
          <Box
            {...attributes}
            {...listeners}
            sx={{
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              mr: 1,
              color: "text.secondary",
              "&:active": {
                cursor: "grabbing",
              },
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </Box>
        )}
        {children}
      </Box>
    </Grid>
  );
};

interface StyleConfig {
  primaryColor?: string;
  buttonText?: string;
  successMessage?: string;
  formBackgroundColor?: string;
}

interface FormPreviewProps {
  fields: Field[];
  userId: string;
  formId: string;
  isLoggedIn: boolean;
  onEdit?: (id: string) => void;
  onSubmit: (formData: Record<string, unknown>) => Promise<void>;
  onDelete?: (id: string) => void;
  errors: { [key: string]: string };
  onToggleRequired?: (id: string) => void;
  onReorder?: (newFields: Field[]) => void;
  loading: boolean;
  styleConfig?: StyleConfig;
  recaptchaEnabled?: boolean;
}

const FormPreview = ({
  fields,
  userId,
  formId,
  isLoggedIn,
  onEdit = () => {},
  onDelete = () => {},
  onToggleRequired = () => {},
  onReorder = () => {},
  styleConfig = {},
  recaptchaEnabled = false,
}: FormPreviewProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDarkMode = theme.palette.mode === "dark";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Ensure fields is always an array
  const safeFields = fields || [];
  const inputFields = safeFields.filter(
    (field) => field.type !== "header" && field.type !== "paragraph",
  );

  const [formData, setFormData] = useState<
    Record<string, { id: string; value: string | boolean | string[] }>
  >({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);

  // Load reCAPTCHA v3 script
  useEffect(() => {
    if (!recaptchaEnabled || isLoggedIn || !recaptchaSiteKey) return;

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setRecaptchaLoaded(true);
    script.onerror = () => {
      console.error("Failed to load reCAPTCHA script");
    };
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector(
        `script[src="https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}"]`,
      );
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove);
      }
    };
  }, [recaptchaEnabled, isLoggedIn, recaptchaSiteKey]);

  // Auto-save draft to localStorage (only when not logged in as seller)
  useEffect(() => {
    if (!isLoggedIn && formId) {
      const savedData = localStorage.getItem(`form-draft-${formId}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Check if saved data is less than 24 hours old
          if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
            setFormData(parsed.data || {});
          } else {
            // Clear stale data
            localStorage.removeItem(`form-draft-${formId}`);
          }
        } catch (e) {
          console.error("Error loading saved form data:", e);
          localStorage.removeItem(`form-draft-${formId}`);
        }
      }
    }
  }, [formId, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn && formId && Object.keys(formData).length > 0) {
      localStorage.setItem(
        `form-draft-${formId}`,
        JSON.stringify({
          data: formData,
          timestamp: Date.now(),
        }),
      );
    }
  }, [formData, formId, isLoggedIn]);

  // Calculate form completion percentage
  useEffect(() => {
    const totalFields = inputFields.length;
    const filledFields = inputFields.filter(
      (field) => formData[field.id]?.value,
    ).length;
    setCompletionPercent(
      totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0,
    );
  }, [formData, inputFields]);

  const handleClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setCurrentFieldId(id);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentFieldId(null);
  };

  const handleMenuAction = (action: string) => {
    if (!currentFieldId) return;

    switch (action) {
      case "edit":
        onEdit(currentFieldId);
        break;
      case "delete":
        onDelete(currentFieldId);
        break;
      case "toggleRequired":
        onToggleRequired(currentFieldId);
        break;
    }
    handleClose();
  };

  const validateField = (field: Field, value: unknown): string => {
    if (
      field.required &&
      (!value ||
        (typeof value === "string" && value.length === 0) ||
        (Array.isArray(value) && value.length === 0))
    ) {
      return `${field.label} is required`;
    }

    if (field.type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value as string)) {
        return "Invalid email address";
      }
    }

    if ((field.type === "tel" || field.type === "phone") && value) {
      const phoneRegex = /^[\d\s()+-]+$/;
      if (!phoneRegex.test(value as string)) {
        return "Invalid phone number";
      }
    }

    if (field.type === "url" && value) {
      try {
        new URL(value as string);
      } catch {
        return "Invalid URL";
      }
    }

    if (field.type === "text" || field.type === "textarea") {
      if (
        field.minLength &&
        value &&
        (value as string).length < field.minLength
      ) {
        return `Minimum ${field.minLength} characters required`;
      }
      if (
        field.maxLength &&
        value &&
        (value as string).length > field.maxLength
      ) {
        return `Maximum ${field.maxLength} characters allowed`;
      }
    }

    if (field.type === "number") {
      const numValue = Number(value);
      if (field.min !== undefined && numValue < field.min) {
        return `Minimum value is ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `Maximum value is ${field.max}`;
      }
    }

    if (field.pattern && value) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value as string)) {
        return field.helperText || "Invalid format";
      }
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let token: string | undefined;

    // Execute reCAPTCHA v3 if enabled
    if (recaptchaEnabled && !isLoggedIn) {
      if (!recaptchaSiteKey) {
        setSnackbarMessage(
          "reCAPTCHA is not configured. Please contact the form owner.",
        );
        setSnackbarOpen(true);
        setIsSubmitting(false);
        return;
      }

      if (!recaptchaLoaded || !window.grecaptcha) {
        setSnackbarMessage("Security verification is loading. Please wait...");
        setSnackbarOpen(true);
        setIsSubmitting(false);
        return;
      }

      try {
        // Execute reCAPTCHA v3
        token = await window.grecaptcha.execute(recaptchaSiteKey, {
          action: "submit",
        });
      } catch (error) {
        console.error("reCAPTCHA execution error:", error);
        setSnackbarMessage(
          "Security verification failed. Please refresh and try again.",
        );
        setSnackbarOpen(true);
        setIsSubmitting(false);
        return;
      }
    }

    // Validate all fields
    const errors: Record<string, string> = {};
    const allTouched: Record<string, boolean> = {};

    for (const field of inputFields) {
      allTouched[field.id] = true;
      const error = validateField(field, formData[field.id]?.value);
      if (error) {
        errors[field.id] = error;
      }
    }

    setTouched(allTouched);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSnackbarMessage("Please fix all errors before submitting");
      setSnackbarOpen(true);
      setIsSubmitting(false);
      return;
    }

    // Prepare all fields for lead filtering
    const allFieldsData = inputFields.reduce(
      (acc, field) => {
        acc[field.label] = formData[field.id]?.value || "";
        return acc;
      },
      {} as Record<string, unknown>,
    );

    // Call the Gatekeeper API to filter the lead
    try {
      const filterResponse = await fetch("/api/filter-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allFieldsData),
      });

      const filterResult = await filterResponse.json();

      if (!filterResponse.ok) {
        // Lead was rejected by the filter
        setSnackbarMessage(
          filterResult.message ||
            "Your submission was flagged by our quality filter. Please review and try again.",
        );
        setSnackbarOpen(true);
        setIsSubmitting(false);
        return;
      }
    } catch (filterError) {
      console.error("Lead filter error:", filterError);
      // Continue with submission if filter fails (fail-open approach)
    }

    // Lead passed the filter - proceed with form submission
    const submissionData = {
      userId,
      formId,
      fields: inputFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formData[field.id]?.value || "",
      })),
      recaptchaToken: recaptchaEnabled && !isLoggedIn ? token : undefined,
    };

    try {
      const response = await fetch("/api/form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      if (result.success) {
        setSnackbarMessage(
          styleConfig?.successMessage ||
            result.message ||
            "Thank you! Your form has been submitted successfully.",
        );
        setSnackbarOpen(true);
        setFormData({});
        setTouched({});
        setFieldErrors({});
        if (recaptchaEnabled && !isLoggedIn) {
          setRecaptchaToken(null);
        }
        if (!isLoggedIn && formId) {
          localStorage.removeItem(`form-draft-${formId}`);
        }
      } else {
        setSnackbarMessage(result.message || "Failed to submit form");
        setSnackbarOpen(true);
      }
    } catch {
      setSnackbarMessage("An error occurred. Please try again.");
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (id: string, value: string | boolean | string[]) => {
    setFormData({ ...formData, [id]: { id, value } });

    if (touched[id]) {
      const field = safeFields.find((f) => f.id === id);
      if (field) {
        const error = validateField(field, value);
        setFieldErrors((prev) => ({
          ...prev,
          [id]: error,
        }));
      }
    }
  };

  const handleBlur = (id: string) => {
    setTouched((prev) => ({ ...prev, [id]: true }));
    const field = safeFields.find((f) => f.id === id);
    if (field) {
      const error = validateField(field, formData[id]?.value);
      setFieldErrors((prev) => ({
        ...prev,
        [id]: error,
      }));
    }
  };

  const getCharacterCount = (id: string, maxLength?: number) => {
    const value = (formData[id]?.value as string) || "";
    return maxLength ? `${value.length}/${maxLength}` : `${value.length}`;
  };

  // Determine form background color based on theme and config
  const getFormBackgroundColor = () => {
    if (styleConfig?.formBackgroundColor && !isLoggedIn) {
      return styleConfig.formBackgroundColor;
    }
    return isDarkMode ? theme.palette.background.paper : "#ffffff";
  };

  // Get primary color for buttons
  const getPrimaryColor = () => {
    return styleConfig?.primaryColor || theme.palette.primary.main;
  };

  const headingVariant = (level?: Field["headingLevel"]) => {
    switch (level) {
      case "h1":
        return "h4";
      case "h2":
        return "h5";
      case "h3":
        return "h6";
      case "h4":
      case "h5":
      case "h6":
        return level as "h4" | "h5" | "h6";
      default:
        return "h5";
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = safeFields.findIndex((field) => field.id === active.id);
      const newIndex = safeFields.findIndex((field) => field.id === over.id);

      const newFields = arrayMove(safeFields, oldIndex, newIndex);
      onReorder(newFields);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3 },
        mt: 2,
        backgroundColor: getFormBackgroundColor(),
        color: isDarkMode ? theme.palette.text.primary : "#000000",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        {/* <Typography
          variant="h6"
          gutterBottom
          sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
        >
          {isLoggedIn ? "Form Preview" : "Submit Your Information"}
        </Typography> */}
        {!isLoggedIn && completionPercent > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mr: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Form Completion
              </Typography>
              <Chip
                label={`${completionPercent}%`}
                size="small"
                color={completionPercent === 100 ? "success" : "primary"}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercent}
              sx={{ height: { xs: 6, sm: 8 }, borderRadius: 4 }}
            />
          </Box>
        )}
      </Box>

      <form onSubmit={handleSubmit}>
        {safeFields.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="textSecondary">
              {isLoggedIn
                ? "No fields added yet. Add fields to preview your form."
                : "This form is currently unavailable."}
            </Typography>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={safeFields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
              disabled={!isLoggedIn}
            >
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {safeFields.map((field) => (
                  <SortableFieldItem
                    key={field.id}
                    field={field}
                    isLoggedIn={isLoggedIn}
                  >
                    <Box sx={{ flex: 1, width: "100%" }}>
                      {field.description && (
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ mb: 1, display: "block" }}
                        >
                          {field.description}
                        </Typography>
                      )}

                      {field.type === "header" && (
                        <Typography
                          variant={headingVariant(field.headingLevel)}
                          sx={{ fontWeight: 700, mt: 1, mb: 0 }}
                        >
                          {field.label}
                        </Typography>
                      )}

                      {field.type === "paragraph" && (
                        <Typography
                          variant="body1"
                          color="textSecondary"
                          sx={{ mt: -4, mb: 1, lineHeight: 1.6 }}
                        >
                          {field.label}
                        </Typography>
                      )}

                      {/* Text Field */}
                      {field.type === "text" && (
                        <TextField
                          label={field.label}
                          fullWidth
                          value={(formData[field.id]?.value as string) || ""}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                          onBlur={() => handleBlur(field.id)}
                          required={field.required}
                          error={touched[field.id] && !!fieldErrors[field.id]}
                          helperText={
                            (touched[field.id] && fieldErrors[field.id]) ||
                            field.helperText ||
                            (field.maxLength &&
                              getCharacterCount(field.id, field.maxLength))
                          }
                          placeholder={field.placeholder}
                          inputProps={{
                            maxLength: field.maxLength,
                            minLength: field.minLength,
                          }}
                          InputProps={{
                            endAdornment:
                              touched[field.id] && !fieldErrors[field.id] ? (
                                <InputAdornment position="end">
                                  <CheckCircleIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                </InputAdornment>
                              ) : null,
                          }}
                        />
                      )}

                      {/* Email Field */}
                      {field.type === "email" && (
                        <TextField
                          label={field.label}
                          type="email"
                          fullWidth
                          value={(formData[field.id]?.value as string) || ""}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                          onBlur={() => handleBlur(field.id)}
                          required={field.required}
                          error={touched[field.id] && !!fieldErrors[field.id]}
                          helperText={
                            (touched[field.id] && fieldErrors[field.id]) ||
                            field.helperText
                          }
                          placeholder={field.placeholder || "your@email.com"}
                          InputProps={{
                            endAdornment:
                              touched[field.id] && !fieldErrors[field.id] ? (
                                <InputAdornment position="end">
                                  <CheckCircleIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                </InputAdornment>
                              ) : null,
                          }}
                        />
                      )}

                      {/* Phone Field */}
                      {(field.type === "tel" || field.type === "phone") && (
                        <TextField
                          label={field.label}
                          type="tel"
                          fullWidth
                          value={(formData[field.id]?.value as string) || ""}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                          onBlur={() => handleBlur(field.id)}
                          required={field.required}
                          error={touched[field.id] && !!fieldErrors[field.id]}
                          helperText={
                            (touched[field.id] && fieldErrors[field.id]) ||
                            field.helperText
                          }
                          placeholder={field.placeholder || "(555) 123-4567"}
                          InputProps={{
                            endAdornment:
                              touched[field.id] && !fieldErrors[field.id] ? (
                                <InputAdornment position="end">
                                  <CheckCircleIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                </InputAdornment>
                              ) : null,
                          }}
                        />
                      )}

                      {/* URL Field */}
                      {field.type === "url" && (
                        <TextField
                          label={field.label}
                          type="url"
                          fullWidth
                          value={(formData[field.id]?.value as string) || ""}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                          onBlur={() => handleBlur(field.id)}
                          required={field.required}
                          error={touched[field.id] && !!fieldErrors[field.id]}
                          helperText={
                            (touched[field.id] && fieldErrors[field.id]) ||
                            field.helperText
                          }
                          placeholder={
                            field.placeholder || "https://example.com"
                          }
                          InputProps={{
                            endAdornment:
                              touched[field.id] && !fieldErrors[field.id] ? (
                                <InputAdornment position="end">
                                  <CheckCircleIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                </InputAdornment>
                              ) : null,
                          }}
                        />
                      )}

                      {/* Number Field */}
                      {field.type === "number" && (
                        <TextField
                          label={field.label}
                          type="number"
                          fullWidth
                          value={(formData[field.id]?.value as string) || ""}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                          onBlur={() => handleBlur(field.id)}
                          required={field.required}
                          error={touched[field.id] && !!fieldErrors[field.id]}
                          helperText={
                            (touched[field.id] && fieldErrors[field.id]) ||
                            field.helperText
                          }
                          placeholder={field.placeholder}
                          inputProps={{
                            min: field.min,
                            max: field.max,
                          }}
                          InputProps={{
                            endAdornment:
                              touched[field.id] && !fieldErrors[field.id] ? (
                                <InputAdornment position="end">
                                  <CheckCircleIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                </InputAdornment>
                              ) : null,
                          }}
                        />
                      )}

                      {/* Date Field */}
                      {field.type === "date" && (
                        <TextField
                          label={field.label}
                          type="date"
                          fullWidth
                          value={(formData[field.id]?.value as string) || ""}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                          onBlur={() => handleBlur(field.id)}
                          required={field.required}
                          error={touched[field.id] && !!fieldErrors[field.id]}
                          helperText={
                            (touched[field.id] && fieldErrors[field.id]) ||
                            field.helperText
                          }
                          InputLabelProps={{
                            shrink: true,
                          }}
                          InputProps={{
                            endAdornment:
                              touched[field.id] && !fieldErrors[field.id] ? (
                                <InputAdornment position="end">
                                  <CheckCircleIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                </InputAdornment>
                              ) : null,
                          }}
                        />
                      )}

                      {/* Textarea Field */}
                      {field.type === "textarea" && (
                        <Box>
                          <TextField
                            label={field.label}
                            fullWidth
                            multiline
                            rows={4}
                            value={(formData[field.id]?.value as string) || ""}
                            onChange={(e) =>
                              handleChange(field.id, e.target.value)
                            }
                            onBlur={() => handleBlur(field.id)}
                            required={field.required}
                            error={touched[field.id] && !!fieldErrors[field.id]}
                            helperText={
                              (touched[field.id] && fieldErrors[field.id]) ||
                              field.helperText ||
                              (field.maxLength &&
                                getCharacterCount(field.id, field.maxLength))
                            }
                            placeholder={field.placeholder}
                            inputProps={{
                              maxLength: field.maxLength,
                            }}
                          />
                        </Box>
                      )}

                      {/* Dropdown Field */}
                      {(field.type === "dropdown" ||
                        field.type === "select") && (
                        <FormControl
                          fullWidth
                          error={touched[field.id] && !!fieldErrors[field.id]}
                        >
                          <InputLabel>{field.label}</InputLabel>
                          <Select
                            label={field.label}
                            value={(formData[field.id]?.value as string) || ""}
                            onChange={(e) =>
                              handleChange(field.id, e.target.value)
                            }
                            onBlur={() => handleBlur(field.id)}
                            required={field.required}
                          >
                            {field.options?.map((option, index) => (
                              <MenuItem key={index} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                          {(touched[field.id] && fieldErrors[field.id]) ||
                          field.helperText ? (
                            <FormHelperText>
                              {(touched[field.id] && fieldErrors[field.id]) ||
                                field.helperText}
                            </FormHelperText>
                          ) : null}
                        </FormControl>
                      )}

                      {/* Radio Field */}
                      {field.type === "radio" && (
                        <FormControl
                          component="fieldset"
                          error={touched[field.id] && !!fieldErrors[field.id]}
                        >
                          <FormLabel component="legend">
                            {field.label}
                          </FormLabel>
                          <RadioGroup
                            value={(formData[field.id]?.value as string) || ""}
                            onChange={(e) =>
                              handleChange(field.id, e.target.value)
                            }
                            onBlur={() => handleBlur(field.id)}
                          >
                            {field.options?.map((option, index) => (
                              <FormControlLabel
                                key={index}
                                value={option}
                                control={<Radio required={field.required} />}
                                label={option}
                              />
                            ))}
                          </RadioGroup>
                          {(touched[field.id] && fieldErrors[field.id]) ||
                          field.helperText ? (
                            <FormHelperText>
                              {(touched[field.id] && fieldErrors[field.id]) ||
                                field.helperText}
                            </FormHelperText>
                          ) : null}
                        </FormControl>
                      )}

                      {/* Checkbox Field */}
                      {field.type === "checkbox" && (
                        <FormControl
                          component="fieldset"
                          error={touched[field.id] && !!fieldErrors[field.id]}
                        >
                          <FormLabel component="legend">
                            {field.label}
                          </FormLabel>
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
                                        (formData[field.id]
                                          ?.value as string[]) || [];
                                      const newValues = e.target.checked
                                        ? [...currentValues, option]
                                        : currentValues.filter(
                                            (v) => v !== option,
                                          );
                                      handleChange(field.id, newValues);
                                    }}
                                    onBlur={() => handleBlur(field.id)}
                                  />
                                }
                                label={option}
                              />
                            ))}
                          </FormGroup>
                          {(touched[field.id] && fieldErrors[field.id]) ||
                          field.helperText ? (
                            <FormHelperText>
                              {(touched[field.id] && fieldErrors[field.id]) ||
                                field.helperText}
                            </FormHelperText>
                          ) : null}
                        </FormControl>
                      )}

                      {/* File Upload Field */}
                      {field.type === "file" && (
                        <Box>
                          <Typography variant="body1" gutterBottom>
                            {field.label}
                          </Typography>
                          <input
                            type="file"
                            onChange={(e) =>
                              handleChange(
                                field.id,
                                e.target.files?.[0]?.name || "",
                              )
                            }
                            style={{ display: "block", marginTop: 8 }}
                          />
                          {field.helperText && (
                            <Typography variant="caption" color="textSecondary">
                              {field.helperText}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>

                    {isLoggedIn && (
                      <IconButton
                        onClick={(e) => handleClick(e, field.id)}
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </SortableFieldItem>
                ))}
              </Grid>
            </SortableContext>
          </DndContext>
        )}

        {recaptchaEnabled && safeFields.length > 0 && isLoggedIn && (
          <Box
            sx={{
              mt: { xs: 3, sm: 4 },
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                p: 2,
                border: "1px dashed",
                borderColor: isDarkMode ? "grey.700" : "grey.400",
                borderRadius: 1,
                backgroundColor: isDarkMode ? "grey.900" : "grey.100",
                width: "100%",
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Google reCAPTCHA v3 is enabled (invisible - runs automatically
                on submit)
              </Typography>
            </Box>
          </Box>
        )}

        {!isLoggedIn && safeFields.length > 0 && (
          <Box
            sx={{
              mt: { xs: 3, sm: 4 },
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                minWidth: { xs: "100%", sm: 200 },
                py: { xs: 1.5, sm: 1 },
                backgroundColor: getPrimaryColor(),
                color: "#ffffff",
                "&:hover": {
                  backgroundColor: getPrimaryColor(),
                  opacity: 0.9,
                },
              }}
            >
              {isSubmitting
                ? "Submitting..."
                : styleConfig?.buttonText || "Submit"}
            </Button>
          </Box>
        )}
      </form>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => handleMenuAction("edit")}>Edit</MenuItem>
        <MenuItem onClick={() => handleMenuAction("toggleRequired")}>
          Toggle Required
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction("delete")}>Delete</MenuItem>
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarMessage.includes("success") ? "success" : "error"}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default FormPreview;
