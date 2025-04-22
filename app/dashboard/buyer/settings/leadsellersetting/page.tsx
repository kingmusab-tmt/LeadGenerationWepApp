"use client";
import { useState } from "react";
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Button,
  Box,
} from "@mui/material";
import axios from "axios";
import { styled } from "@mui/system";
import { toast } from "react-toastify";

const SettingsContainer = styled(Container)({
  marginTop: "20px",
  padding: "20px",
  backgroundColor: "#fff",
  borderRadius: "8px",
  // boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
});

const Section = styled(Box)({
  marginBottom: "20px",
  padding: "15px",
  border: "1px solid #ddd",
  borderRadius: "6px",
  // backgroundColor: "#f9f9f9",
});

const LeadSettings = () => {
  const [emailSettings, setEmailSettings] = useState({
    emailAddress: "",
    mailDomain: "",
    smtpServer: "",
    smtpUser: "",
    smtpPassword: "",
    port: "",
  });
  const [apiSettings, setApiSettings] = useState({
    twilioSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
  });

  const handleSaveSettings = async () => {
    try {
      await axios.post("/api/settings", {
        emailSettings,
        apiSettings,
      });
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  return (
    <SettingsContainer>
      <Section>
        <Typography variant="h6">Email Settings</Typography>
        <TextField
          label="E-mail Address"
          fullWidth
          margin="normal"
          value={emailSettings.emailAddress}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, emailAddress: e.target.value })
          }
        />
        <TextField
          label="Mail Domain Name"
          fullWidth
          margin="normal"
          value={emailSettings.mailDomain}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, mailDomain: e.target.value })
          }
        />
        <TextField
          label="SMTP Server"
          fullWidth
          margin="normal"
          value={emailSettings.smtpServer}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, smtpServer: e.target.value })
          }
        />
        <TextField
          label="SMTP User"
          fullWidth
          margin="normal"
          value={emailSettings.smtpUser}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, smtpUser: e.target.value })
          }
        />
        <TextField
          label="SMTP Password"
          fullWidth
          margin="normal"
          type="password"
          value={emailSettings.smtpPassword}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })
          }
        />
        <TextField
          label="Port"
          fullWidth
          margin="normal"
          type="number"
          value={emailSettings.port}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, port: e.target.value })
          }
        />
      </Section>

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
          fullWidth
          margin="normal"
          type="password"
          value={apiSettings.twilioAuthToken}
          onChange={(e) =>
            setApiSettings({ ...apiSettings, twilioAuthToken: e.target.value })
          }
        />
        <TextField
          label="Twilio Phone Number"
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
      </Section>
      <Button variant="contained" color="primary" onClick={handleSaveSettings}>
        Save Settings
      </Button>
    </SettingsContainer>
  );
};

export default LeadSettings;
