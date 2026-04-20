"use client";
import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  Chat as ChatIcon,
  CheckCircle,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

const TawkSetupForm = () => {
  const [form, setForm] = useState({
    tawkPropertyId: "",
    tawkWidgetId: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fetchWithCSRF = useCSRFFetch();

  // Fetch existing configuration on mount
  useEffect(() => {
    const fetchTawkConfig = async () => {
      try {
        const res = await fetch("/api/settings/sellerlivechat", {
          method: "GET",
        });
        const data = await res.json();
        if (data.success) {
          setForm({
            tawkPropertyId: data.propertyId || "",
            tawkWidgetId: data.widgetId || "",
          });
          // If configuration exists, show it as just saved
          if (data.propertyId || data.widgetId) {
            setLastSaved(new Date());
          }
        }
      } catch (error) {
        console.error("Error fetching Tawk config:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTawkConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (status === "success") {
      setStatus("idle");
    }
  };

  const handleSubmit = async () => {
    setStatus("idle");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetchWithCSRF("/api/settings/sellerlivechat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage("Tawk.to configuration updated successfully!");
        setLastSaved(new Date());
      } else {
        throw new Error(data.message || data.error || "Something went wrong");
      }
    } catch (error: unknown) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "idle") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <Box sx={{ mt: -2 }}>
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        Configure Tawk.to live chat widget for your seller dashboard. Get your
        Property ID and Widget ID from your Tawk.to account settings.
      </Alert>

      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <ChatIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight="600">
                  Tawk.to Live Chat
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure your live chat widget credentials
                </Typography>
              </Box>
            </Box>
            {lastSaved && (
              <Chip
                icon={<CheckCircle />}
                label={`Saved ${lastSaved.toLocaleTimeString()}`}
                color="success"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Divider sx={{ mb: 3 }} />

          {initialLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Tawk Property ID"
                name="tawkPropertyId"
                fullWidth
                value={form.tawkPropertyId}
                onChange={handleChange}
                placeholder="Enter your Tawk Property ID"
                helperText={
                  lastSaved && form.tawkPropertyId
                    ? "✓ Configured"
                    : "Your Tawk.to property identifier"
                }
              />
              <TextField
                label="Tawk Widget ID"
                name="tawkWidgetId"
                fullWidth
                value={form.tawkWidgetId}
                onChange={handleChange}
                placeholder="Enter your Tawk Widget ID"
                helperText={
                  lastSaved && form.tawkWidgetId
                    ? "✓ Configured"
                    : "Your Tawk.to widget identifier"
                }
              />

              {status !== "idle" && (
                <Alert severity={status === "success" ? "success" : "error"}>
                  {message}
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
        <Divider />
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            p: 2.5,
            bgcolor: "grey.50",
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={loading || initialLoading}
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <ChatIcon />
              )
            }
          >
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default TawkSetupForm;
