"use client";

import { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Container,
  Alert,
  Snackbar,
  Box,
  Card,
  Button,
  Fade,
  Skeleton,
} from "@mui/material";
import dynamic from "next/dynamic";

const FormPreview = dynamic(
  () => import("@/app/components/leadcapture/FormPreview"),
  { ssr: false },
);

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

export default function FormPageClient({ formId }: { formId: string }) {
  const [formStructure, setFormStructure] = useState<Field[]>([]);
  const [styleConfig, setStyleConfig] = useState<StyleConfig | undefined>(
    undefined,
  );
  const [recaptchaEnabled, setRecaptchaEnabled] = useState<boolean>(false);
  const [brandColor, setBrandColor] = useState<string>("#1976d2");
  const [loading, setLoading] = useState<boolean>(true);
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
  const [formLoadToken, setFormLoadToken] = useState<string | undefined>(
    undefined,
  );
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
          setStyleConfig(formData.styleConfig);
          setRecaptchaEnabled(Boolean(formData.recaptchaEnabled));
          setBrandColor(formData.styleConfig?.primaryColor || "#1976d2");
          setFormLoadToken(formData.formLoadToken);
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

  // FormPreview owns the actual /api/form/submit request (it's the only
  // implementation that matches that endpoint's real payload shape — see
  // FormPreview.tsx). This just reacts to a successful submission to show
  // the full-page "Thank You" confirmation below.
  const handleSubmitSuccess = () => {
    setSubmitted(true);
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
                  {/* Honeypot field - hidden from users and from assistive tech */}
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
                    aria-hidden="true"
                  />

                  <FormPreview
                    fields={formStructure}
                    formId={formId}
                    isLoggedIn={false}
                    onSubmitSuccess={handleSubmitSuccess}
                    honeypot={honeypot}
                    formLoadToken={formLoadToken}
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
                    Your information has been submitted successfully. We&apos;ll
                    be in touch soon!
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
