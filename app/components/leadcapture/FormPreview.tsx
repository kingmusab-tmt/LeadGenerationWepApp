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
import GoogleCityAutocomplete from "../GoogleCityAutocomplete";

// Declare grecaptcha for TypeScript
declare global {
  interface Window {
    grecaptcha: any;
  }
}

const DRAFT_TTL_MS = 30 * 60 * 1000;

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
  disabled?: boolean;
  linkedTo?: string;
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
  // Backward-compatible aliases used by older saved forms.
  backgroundColor?: string;
  accentColor?: string;
}

interface FormPreviewProps {
  fields: Field[];
  formId: string;
  isLoggedIn: boolean;
  onEdit?: (id: string) => void;
  // Called after this component's own submission to /api/form/submit
  // succeeds — lets the public page show its own success state (e.g. a
  // full "Thank You" screen) without owning the submission request itself.
  onSubmitSuccess?: () => void;
  onDelete?: (id: string) => void;
  onToggleRequired?: (id: string) => void;
  onReorder?: (newFields: Field[]) => void;
  loading: boolean;
  styleConfig?: StyleConfig;
  recaptchaEnabled?: boolean;
  // Anti-spam signals owned by the parent page (which renders the honeypot
  // input itself) but sent as part of THIS component's own submission,
  // since this is the only code path that actually posts to
  // /api/form/submit today.
  honeypot?: string;
  formLoadToken?: string;
}

const FormPreview = ({
  fields,
  formId,
  isLoggedIn,
  onEdit = () => {},
  onSubmitSuccess,
  onDelete = () => {},
  onToggleRequired = () => {},
  onReorder = () => {},
  styleConfig = {},
  recaptchaEnabled = false,
  honeypot,
  formLoadToken,
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
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "error",
  );
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

  // Auto-save draft to localStorage (only when not logged in as seller).
  // TTL is intentionally short (30 min, not 24h) — this form is typically
  // embedded under a public/shared formId, so on a kiosk or shared device a
  // long-lived draft could resurface a prior visitor's partial name/email/
  // phone for the next person who opens the same form.
  useEffect(() => {
    if (!isLoggedIn && formId) {
      const savedData = localStorage.getItem(`form-draft-${formId}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.timestamp && Date.now() - parsed.timestamp < DRAFT_TTL_MS) {
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

    // Number("") is 0, which would otherwise fail a min > 0 check on a field
    // that's simply empty (and, if not required, is allowed to be).
    if (field.type === "number" && value !== undefined && value !== "") {
      const numValue = Number(value);
      if (field.min !== undefined && numValue < field.min) {
        return `Minimum value is ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `Maximum value is ${field.max}`;
      }
    }

    // No current save path can persist field.pattern (it's absent from both
    // the Zod and Mongoose form schemas), so this isn't reachable with
    // today's data — but a malformed or intentionally-catastrophic regex
    // here would otherwise be able to hang every visitor's browser on every
    // keystroke, so it's guarded defensively rather than assumed safe.
    if (field.pattern && value) {
      try {
        if (field.pattern.length > 200) {
          return field.helperText || "Invalid format";
        }
        const regex = new RegExp(field.pattern);
        if (!regex.test(value as string)) {
          return field.helperText || "Invalid format";
        }
      } catch {
        return field.helperText || "Invalid format";
      }
    }

    return "";
  };

  const showMessage = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Moves focus (and scrolls) to the first invalid field after a failed
  // validation pass, rather than leaving a sighted-only Snackbar as the only
  // signal that something needs correction (WCAG 2.4.3 / 3.3.1).
  const focusFirstError = (errors: Record<string, string>) => {
    const firstErrorField = inputFields.find((field) => errors[field.id]);
    if (!firstErrorField) return;
    const wrapper = document.getElementById(
      `field-wrapper-${firstErrorField.id}`,
    );
    if (!wrapper) return;
    wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = wrapper.querySelector<HTMLElement>(
      "input, select, textarea, [tabindex]",
    );
    focusable?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let token: string | undefined;

    // Execute reCAPTCHA v3 if enabled
    if (recaptchaEnabled && !isLoggedIn) {
      if (!recaptchaSiteKey) {
        showMessage(
          "reCAPTCHA is not configured. Please contact the form owner.",
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      if (!recaptchaLoaded || !window.grecaptcha) {
        showMessage("Security verification is loading. Please wait...", "error");
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
        showMessage(
          "Security verification failed. Please refresh and try again.",
          "error",
        );
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
      showMessage("Please fix all errors before submitting", "error");
      focusFirstError(errors);
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
        showMessage(
          filterResult.message ||
            "Your submission was flagged by our quality filter. Please review and try again.",
          "error",
        );
        setIsSubmitting(false);
        return;
      }
    } catch (filterError) {
      console.error("Lead filter error:", filterError);
      // Continue with submission if filter fails (fail-open approach)
    }

    // Lead passed the filter - proceed with form submission. This is the
    // only code path that actually calls /api/form/submit — a parent-owned
    // onSubmit used to exist for this but was never invoked, silently
    // disconnecting the honeypot/timing anti-spam signals and the
    // post-submit success UI from the request that actually runs; both are
    // folded in here instead.
    const submissionData = {
      formId,
      fields: inputFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formData[field.id]?.value || "",
      })),
      recaptchaToken: recaptchaEnabled && !isLoggedIn ? token : undefined,
      honeypot: !isLoggedIn ? honeypot : undefined,
      formLoadToken: !isLoggedIn ? formLoadToken : undefined,
    };

    try {
      const response = await fetch("/api/form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      if (result.success) {
        showMessage(
          styleConfig?.successMessage ||
            result.message ||
            "Thank you! Your form has been submitted successfully.",
          "success",
        );
        setFormData({});
        setTouched({});
        setFieldErrors({});
        if (recaptchaEnabled && !isLoggedIn) {
          setRecaptchaToken(null);
        }
        if (!isLoggedIn && formId) {
          localStorage.removeItem(`form-draft-${formId}`);
        }
        onSubmitSuccess?.();
      } else {
        showMessage(result.message || "Failed to submit form", "error");
      }
    } catch {
      showMessage("An error occurred. Please try again.", "error");
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

  const resolvedBackgroundColor =
    styleConfig?.formBackgroundColor || styleConfig?.backgroundColor;
  const resolvedPrimaryColor =
    styleConfig?.primaryColor || styleConfig?.accentColor;

  // Determine form background color based on config/theme
  const getFormBackgroundColor = () => {
    if (resolvedBackgroundColor) {
      return resolvedBackgroundColor;
    }
    return isDarkMode ? theme.palette.background.paper : "#ffffff";
  };

  // Get primary color for buttons
  const getPrimaryColor = () => {
    return resolvedPrimaryColor || theme.palette.primary.main;
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
        // Derived from the actual background in use (theme's or the
        // seller's custom formBackgroundColor) rather than hardcoded, so a
        // dark or light custom brand color can't produce illegible
        // black-on-black or white-on-white text.
        color: theme.palette.getContrastText(getFormBackgroundColor()),
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
                    <Box id={`field-wrapper-${field.id}`} sx={{ flex: 1, width: "100%" }}>
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
                          <InputLabel required={field.required}>
                            {field.label}
                          </InputLabel>
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

                      {/* City Autocomplete Field (Powered by Google) */}
                      {field.type === "city_autocomplete" && (
                        <GoogleCityAutocomplete
                          label={field.label}
                          value={(formData[field.id]?.value as string) || ""}
                          onChange={(cityValue) =>
                            handleChange(field.id, cityValue)
                          }
                          onSelectWithState={(stateValue) => {
                            // Auto-populate linked state field
                            if (field.linkedTo) {
                              handleChange(field.linkedTo, stateValue);
                            }
                          }}
                          onBlur={() => handleBlur(field.id)}
                          required={field.required}
                          error={touched[field.id] && !!fieldErrors[field.id]}
                          errorText={fieldErrors[field.id]}
                          helperText={field.helperText}
                          placeholder={field.placeholder || "Search city..."}
                        />
                      )}

                      {/* State Auto-populated Field (Linked to City) */}
                      {field.type === "state_auto" && (
                        <TextField
                          label={field.label}
                          value={(formData[field.id]?.value as string) || ""}
                          fullWidth
                          disabled
                          helperText="Auto-populated based on city selection"
                          slotProps={{
                            input: {
                              readOnly: true,
                            },
                          }}
                          sx={{
                            "& .MuiInputBase-input.Mui-disabled": {
                              WebkitTextFillColor: theme.palette.text.disabled,
                              color: theme.palette.text.disabled,
                            },
                          }}
                        />
                      )}

                      {/* Radio Field */}
                      {field.type === "radio" && (
                        <FormControl
                          component="fieldset"
                          error={touched[field.id] && !!fieldErrors[field.id]}
                        >
                          <FormLabel component="legend" required={field.required}>
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
                          <FormLabel component="legend" required={field.required}>
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
                      {/* File upload isn't wired to any storage backend —
                          the previous input silently captured only the
                          filename and discarded the actual file, giving no
                          indication anything was lost. This type can no
                          longer be created going forward (excluded from the
                          form-field schema); this branch only covers a
                          field saved before that change. */}
                      {field.type === "file" && (
                        <Box>
                          <Typography variant="body1" gutterBottom>
                            {field.label}
                          </Typography>
                          <Typography variant="body2" color="error">
                            File upload isn&apos;t currently supported for
                            this form. Please contact the site owner if you
                            need to share a file.
                          </Typography>
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
                        aria-label={`Field options for ${field.label}`}
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

        {safeFields.length > 0 && (
          <Box
            sx={{
              mt: { xs: 3, sm: 4 },
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Button
              type={isLoggedIn ? "button" : "submit"}
              variant="contained"
              disabled={isSubmitting}
              sx={{
                minWidth: { xs: "100%", sm: 200 },
                py: { xs: 1.5, sm: 1 },
                backgroundColor: getPrimaryColor(),
                color: theme.palette.getContrastText(getPrimaryColor()),
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
            {isLoggedIn && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Button preview only. Submissions are enabled after publishing.
              </Typography>
            )}
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
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default FormPreview;
