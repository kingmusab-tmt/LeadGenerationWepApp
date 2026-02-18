"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  Divider,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Code as CodeIcon,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Info as InfoIcon,
} from "@mui/icons-material";
import axios from "@/lib/axiosInstance";
import { toast } from "react-toastify";

const APISettingsPage = () => {
  const [apiSettings, setApiSettings] = useState({
    twilioSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    stripeApiKey: "",
    googleApiKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showFields, setShowFields] = useState({
    twilioAuthToken: false,
    stripeApiKey: false,
    googleApiKey: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/settings");
        if (data?.success) {
          const s = data.data?.apiSettings || {};
          setApiSettings({
            twilioSid: s.twilioSid || "",
            twilioAuthToken: s.twilioAuthToken || "",
            twilioPhoneNumber: s.twilioPhoneNumber || "",
            stripeApiKey: s.stripeApiKey || "",
            googleApiKey: s.googleApiKey || "",
          });
          if (s.twilioSid || s.stripeApiKey) {
            const now = new Date().toLocaleTimeString();
            setLastSaved(now);
          }
        }
      } catch (e) {
        // ignore load error
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post("/api/settings", {
        apiSettings,
      });
      toast.success("API settings updated successfully!");
      const now = new Date().toLocaleTimeString();
      setLastSaved(now);
    } catch (e) {
      toast.error("Failed to update API settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (field: keyof typeof showFields) => {
    setShowFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <Box sx={{ mt: -2 }}>
      <Alert severity="warning" icon={<InfoIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="600" gutterBottom>
          Security Notice
        </Typography>
        <Typography variant="body2">
          Store your API keys securely. Never share these credentials or commit
          them to version control. These keys provide access to sensitive
          third-party services.
        </Typography>
      </Alert>

      <Card
        elevation={0}
        sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
      >
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
                Twilio API Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure Twilio for SMS and voice call functionality
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="Twilio Account SID"
              fullWidth
              value={apiSettings.twilioSid}
              onChange={(e) =>
                setApiSettings({ ...apiSettings, twilioSid: e.target.value })
              }
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              helperText="Your Twilio Account SID (starts with AC)"
            />

            <TextField
              label="Twilio Auth Token"
              type={showFields.twilioAuthToken ? "text" : "password"}
              fullWidth
              value={apiSettings.twilioAuthToken}
              onChange={(e) =>
                setApiSettings({
                  ...apiSettings,
                  twilioAuthToken: e.target.value,
                })
              }
              placeholder="Enter your Twilio Auth Token"
              helperText="Your Twilio authentication token"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => toggleVisibility("twilioAuthToken")}
                      edge="end"
                    >
                      {showFields.twilioAuthToken ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Twilio Phone Number"
              fullWidth
              value={apiSettings.twilioPhoneNumber}
              onChange={(e) =>
                setApiSettings({
                  ...apiSettings,
                  twilioPhoneNumber: e.target.value,
                })
              }
              placeholder="+1234567890"
              helperText="Phone number in E.164 format (e.g., +1234567890)"
            />
          </Box>
        </CardContent>
      </Card>

      <Card
        elevation={0}
        sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="600">
              Stripe API Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure Stripe for payment processing
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <TextField
            label="Stripe API Key"
            type={showFields.stripeApiKey ? "text" : "password"}
            fullWidth
            value={apiSettings.stripeApiKey}
            onChange={(e) =>
              setApiSettings({ ...apiSettings, stripeApiKey: e.target.value })
            }
            placeholder="sk_live_xxxxxxxxxxxxxxxxxxxx"
            helperText="Your Stripe secret API key"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleVisibility("stripeApiKey")}
                    edge="end"
                  >
                    {showFields.stripeApiKey ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="600">
              Google API Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure Google services integration
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <TextField
            label="Google API Key"
            type={showFields.googleApiKey ? "text" : "password"}
            fullWidth
            value={apiSettings.googleApiKey}
            onChange={(e) =>
              setApiSettings({ ...apiSettings, googleApiKey: e.target.value })
            }
            placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            helperText="Your Google Cloud API key"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleVisibility("googleApiKey")}
                    edge="end"
                  >
                    {showFields.googleApiKey ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
        <Divider />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2.5,
            bgcolor: "grey.50",
          }}
        >
          {lastSaved && (
            <Chip
              icon={<CheckCircle />}
              label={`Last saved at ${lastSaved}`}
              color="success"
              size="small"
              variant="outlined"
            />
          )}
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <CodeIcon />}
          >
            {saving ? "Saving..." : "Save API Keys"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default APISettingsPage;
