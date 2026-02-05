"use client";
import React, { useEffect, useState } from "react";
import { Container, Typography, TextField, Button, Box } from "@mui/material";
import { styled } from "@mui/system";
import axios from "axios";
import { toast } from "react-toastify";
import { useCSRF } from "@/app/hooks";

const SettingsContainer = styled(Container)({
  marginTop: "20px",
  padding: "20px",
  backgroundColor: "#fff",
  borderRadius: "8px",
});

const Section = styled(Box)({
  marginBottom: "20px",
  padding: "15px",
  border: "1px solid #ddd",
  borderRadius: "6px",
});

const APISettingsPage = () => {
  const { csrfToken } = useCSRF();
  const [apiSettings, setApiSettings] = useState({
    twilioSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    stripeApiKey: "",
    googleApiKey: "",
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
        }
      } catch (e) {
        // ignore load error
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      await axios.post(
        "/api/settings",
        {
          apiSettings,
        },
        {
          headers: {
            "X-CSRF-Token": csrfToken || "",
          },
        },
      );
      toast.success("API settings updated");
    } catch (e) {
      toast.error("Failed to update API settings");
    }
  };

  return (
    <SettingsContainer>
      <Section>
        <Typography variant="h6">API Settings</Typography>
        <TextField
          label="Twilio SID"
          fullWidth
          margin="normal"
          value={apiSettings.twilioSid}
          onChange={(e) =>
            setApiSettings({ ...apiSettings, twilioSid: e.target.value })
          }
        />
        <TextField
          label="Twilio Auth Token"
          type="password"
          fullWidth
          margin="normal"
          value={apiSettings.twilioAuthToken}
          onChange={(e) =>
            setApiSettings({ ...apiSettings, twilioAuthToken: e.target.value })
          }
        />
        <TextField
          label="Twilio Phone Number (E.164)"
          fullWidth
          margin="normal"
          value={apiSettings.twilioPhoneNumber}
          onChange={(e) =>
            setApiSettings({
              ...apiSettings,
              twilioPhoneNumber: e.target.value,
            })
          }
        />
        <TextField
          label="Stripe API Key"
          fullWidth
          margin="normal"
          value={apiSettings.stripeApiKey}
          onChange={(e) =>
            setApiSettings({ ...apiSettings, stripeApiKey: e.target.value })
          }
        />
        <TextField
          label="Google API Key"
          fullWidth
          margin="normal"
          value={apiSettings.googleApiKey}
          onChange={(e) =>
            setApiSettings({ ...apiSettings, googleApiKey: e.target.value })
          }
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleSave}>
            Save API Settings
          </Button>
        </Box>
      </Section>
    </SettingsContainer>
  );
};

export default APISettingsPage;
