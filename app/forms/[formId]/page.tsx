"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Typography,
  Paper,
  Container,
  Backdrop,
  Alert,
  Snackbar,
  Box,
  Card,
  CardContent,
  Button,
  Fade,
  Skeleton,
} from "@mui/material";
import FormPreview from "@/app/components/leadcapture/FormPreview";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

interface Field {
  id: string;
  type: string;
  label: string;
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
}

interface StyleConfig {
  primaryColor?: string;
  buttonText?: string;
  successMessage?: string;
  formBackgroundColor?: string;
}

interface FormData {
  userId: string;
  message: string;
  fields: Field[];
  leadSource?: string;
  formName?: string;
  description?: string;
  styleConfig?: StyleConfig;
  recaptchaEnabled?: boolean;
}

export default function FormPage() {
  const params = useParams();
  const formId =
    typeof params.formId === "string"
      ? params.formId
      : (params.formId?.[0] ?? "");
  const [formStructure, setFormStructure] = useState<Field[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [formTitle, setFormTitle] = useState<string>("Lead Capture Form");
  const [formDescription, setFormDescription] = useState<string>("");
  const [styleConfig, setStyleConfig] = useState<StyleConfig | undefined>(
    undefined,
  );
  const [recaptchaEnabled, setRecaptchaEnabled] = useState<boolean>(false);
  const [brandColor, setBrandColor] = useState<string>("#1976d2");
  const [loading, setLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [formLoadTime] = useState<number>(Date.now());
  const [honeypot, setHoneypot] = useState<string>("");

  useEffect(() => {
    if (!formId) return;

    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/form?formId=${formId}`);
        const result = await response.json();
        if (response.ok && result.success && result.data) {
          const formData = result.data;
          setFormStructure(formData.fields || []);
          setUserId(formData.userId || "");
          setLeadSource(formData.leadSource || formData.description || "");
          setFormTitle(formData.formName || "Lead Capture Form");
          setFormDescription(formData.description || "");
          setStyleConfig(formData.styleConfig);
          setRecaptchaEnabled(Boolean(formData.recaptchaEnabled));
          setBrandColor(formData.styleConfig?.primaryColor || "#1976d2");
        } else {
          setSnackbar({
            open: true,
            message: result?.message || "Failed to fetch form",
            severity: "error",
          });
        }
      } catch (error) {
        console.error("Error fetching form:", error);
        setSnackbar({
          open: true,
          message: "An error occurred while fetching the form",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  // Send height updates to parent window (for iframe embedding)
  useEffect(() => {
    const sendHeightToParent = () => {
      const height = document.documentElement.scrollHeight;
      if (window.parent !== window) {
        window.parent.postMessage({ FrameHeight: height }, "*");
      }
    };

    // Send initial height
    sendHeightToParent();

    // Send height updates on window resize and mutations
    const resizeObserver = new ResizeObserver(sendHeightToParent);
    resizeObserver.observe(document.body);

    window.addEventListener("resize", sendHeightToParent);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", sendHeightToParent);
    };
  }, [loading, submitted]);

  const handleSubmit = async (formData: { [key: string]: any }) => {
    setLoading(true);
    setErrors({});

    // Validate required fields
    const newErrors: { [key: string]: string } = {};
    formStructure.forEach((field) => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      setSnackbar({
        open: true,
        message: "Please fill all required fields",
        severity: "error",
      });
      return;
    }

    try {
      const response = await fetch("/api/form/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Honeypot": honeypot, // Include honeypot
          "X-Timestamp": formLoadTime.toString(), // Include form load time
        },
        body: JSON.stringify({
          formId,
          fields: formData,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSnackbar({
          open: true,
          message: "Form submitted successfully!",
          severity: "success",
        });
        setSubmitted(true);
      } else {
        setSnackbar({
          open: true,
          message: result?.message || "Failed to submit form",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSnackbar({
        open: true,
        message: "An error occurred while submitting the form",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}05 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="md" sx={{ padding: { xs: 2, sm: 4 } }}>
        {loading ? (
          <Paper elevation={3} sx={{ p: 4 }}>
            <Skeleton variant="text" width="60%" height={60} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={400} sx={{ mt: 3 }} />
          </Paper>
        ) : (
          <>
            <Fade in={!submitted} timeout={500}>
              <Box sx={{ display: submitted ? "none" : "block" }}>
                <Paper
                  elevation={3}
                  sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}
                >
                  {/* Honeypot field - hidden from users */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{
                      position: "absolute",
                      left: "-9999px",
                      width: "1px",
                      height: "1px",
                    }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <FormPreview
                    fields={formStructure}
                    userId={userId}
                    formId={formId}
                    isLoggedIn={false}
                    onSubmit={handleSubmit}
                    errors={errors}
                    loading={loading}
                    styleConfig={styleConfig}
                    recaptchaEnabled={recaptchaEnabled}
                  />
                </Paper>

                <Box
                  sx={{
                    mt: { xs: 2, sm: 3 },
                    textAlign: "center",
                    px: { xs: 2, sm: 0 },
                  }}
                >
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
                  >
                    🔒 Your information is secure and will never be shared
                  </Typography>
                </Box>
              </Box>
            </Fade>

            {/* Success Message */}
            <Fade in={submitted} timeout={500}>
              <Box sx={{ display: submitted ? "block" : "none" }}>
                <Card
                  elevation={4}
                  sx={{
                    textAlign: "center",
                    p: { xs: 3, sm: 4, md: 6 },
                    borderRadius: 2,
                    background: `linear-gradient(135deg, #ffffff 0%, ${brandColor}10 100%)`,
                  }}
                >
                  <CheckCircleOutlineIcon
                    sx={{
                      fontSize: { xs: 60, sm: 80 },
                      color: "success.main",
                      mb: 2,
                    }}
                  />
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "1.75rem", sm: "2.125rem" },
                    }}
                  >
                    Thank You!
                  </Typography>
                  <Typography
                    variant="h6"
                    color="textSecondary"
                    sx={{
                      mb: 3,
                      maxWidth: 500,
                      mx: "auto",
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                      px: { xs: 2, sm: 0 },
                    }}
                  >
                    Your information has been submitted successfully. We'll be
                    in touch soon!
                  </Typography>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => window.close()}
                    sx={{
                      mt: 2,
                      px: { xs: 4, sm: 3 },
                      py: { xs: 1.5, sm: 1 },
                      width: { xs: "100%", sm: "auto" },
                      maxWidth: { xs: "100%", sm: 200 },
                    }}
                  >
                    Close Window
                  </Button>
                </Card>
              </Box>
            </Fade>
          </>
        )}

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
