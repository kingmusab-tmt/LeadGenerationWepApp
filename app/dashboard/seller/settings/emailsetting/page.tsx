"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Email as EmailIcon,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Send as SendIcon,
} from "@mui/icons-material";
import axios from "@/lib/axiosInstance";
import { useNotification } from "@/app/hooks/useNotification";

const EmailSettingsPage = () => {
  const notify = useNotification();
  const [emailSettings, setEmailSettings] = useState({
    smtpServer: "",
    smtpUser: "",
    smtpPassword: "",
    port: 0 as number | string,
    fromEmail: "",
    fromName: "",
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/settings");
        if (data?.success) {
          const s = data.data?.emailSettings || {};
          setEmailSettings({
            smtpServer: s.smtpServer || "",
            smtpUser: s.smtpUser || "",
            smtpPassword: s.smtpPassword || "",
            port: s.port ?? 0,
            fromEmail: s.fromEmail || "",
            fromName: s.fromName || "",
          });
          if (s.smtpServer) {
            setIsSaved(true);
          }
        }
      } catch (e) {
        // ignore load error
      }
    })();
  }, []);

  const handleInputChange = (
    field: keyof typeof emailSettings,
    value: string,
  ) => {
    setEmailSettings({ ...emailSettings, [field]: value });
    setIsSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post("/api/settings", {
        emailSettings: {
          ...emailSettings,
          port:
            typeof emailSettings.port === "string"
              ? parseInt(emailSettings.port || "0", 10)
              : emailSettings.port,
        },
      });
      notify("Email settings saved successfully!", "success");
      setIsSaved(true);
      const now = new Date().toLocaleTimeString();
      setLastSaved(now);
    } catch (e: any) {
      notify(
        e?.response?.data?.message || "Failed to update email settings",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const { data } = await axios.post("/api/settings/test-smtp");
      if (data.success) {
        notify(data.message || "SMTP connection successful!", "success");
      } else {
        notify(data.error || "SMTP connection failed", "error");
      }
    } catch (e: any) {
      notify(
        e?.response?.data?.error || "SMTP connection test failed",
        "error",
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ mt: -2 }}>
      <Alert severity="info" icon={<EmailIcon />} sx={{ mb: 3 }}>
        Configure your SMTP email server settings for sending transactional
        emails and notifications. Make sure to save and test your connection
        after updating.
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
            <Box>
              <Typography variant="h6" gutterBottom fontWeight="600">
                SMTP Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure your email server connection details
              </Typography>
            </Box>
            {isSaved && lastSaved && (
              <Chip
                icon={<CheckCircle />}
                label={`Saved at ${lastSaved}`}
                color="success"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="SMTP Server"
              fullWidth
              value={emailSettings.smtpServer}
              onChange={(e) => handleInputChange("smtpServer", e.target.value)}
              placeholder="smtp.gmail.com"
              helperText="Your email provider's SMTP server address"
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="SMTP Username (Email)"
                fullWidth
                value={emailSettings.smtpUser}
                onChange={(e) => handleInputChange("smtpUser", e.target.value)}
                placeholder="your-email@example.com"
                helperText="Email address for authentication"
              />
              <TextField
                label="SMTP Port"
                type="number"
                fullWidth
                value={emailSettings.port}
                onChange={(e) => handleInputChange("port", e.target.value)}
                placeholder="587"
                helperText="Usually 587 for TLS"
              />
            </Box>

            <TextField
              label="SMTP Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              value={emailSettings.smtpPassword}
              onChange={(e) =>
                handleInputChange("smtpPassword", e.target.value)
              }
              placeholder="Enter your SMTP password"
              helperText="Your email account password or app-specific password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Divider sx={{ my: 1 }} />

            <Typography
              variant="subtitle2"
              fontWeight="600"
              color="text.secondary"
            >
              Sender Information
            </Typography>

            <TextField
              label="From Email"
              fullWidth
              value={emailSettings.fromEmail}
              onChange={(e) => handleInputChange("fromEmail", e.target.value)}
              placeholder="noreply@yourdomain.com"
              helperText="Email address that will appear in the 'From' field"
            />

            <TextField
              label="From Name"
              fullWidth
              value={emailSettings.fromName}
              onChange={(e) => handleInputChange("fromName", e.target.value)}
              placeholder="Your Company Name"
              helperText="Display name that will appear alongside the email"
            />
          </Box>
        </CardContent>
        <Divider />
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            p: 2.5,
            gap: 2,
            bgcolor: "grey.50",
          }}
        >
          {isSaved && emailSettings.smtpServer && (
            <Button
              variant="outlined"
              startIcon={
                testing ? <CircularProgress size={20} /> : <SendIcon />
              }
              onClick={handleTestConnection}
              disabled={testing || saving}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          )}
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving || testing}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default EmailSettingsPage;
