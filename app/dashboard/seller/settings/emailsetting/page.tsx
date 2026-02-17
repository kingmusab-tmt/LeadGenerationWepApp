"use client";
import React, { useEffect, useState } from "react";
import { Container, Typography, TextField, Button, Box } from "@mui/material";
import { styled } from "@mui/system";
import axios from "@/lib/axiosInstance";
import { toast } from "react-toastify";

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

const EmailSettingsPage = () => {
  const [emailSettings, setEmailSettings] = useState({
    smtpServer: "",
    smtpUser: "",
    smtpPassword: "",
    port: 0 as number | string,
    fromEmail: "",
    fromName: "",
  });
  const [testing, setTesting] = useState(false);

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
        }
      } catch (e) {
        // ignore load error
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      await axios.post("/api/settings", {
        emailSettings: {
          ...emailSettings,
          port:
            typeof emailSettings.port === "string"
              ? parseInt(emailSettings.port || "0", 10)
              : emailSettings.port,
        },
      });
      toast.success("Email settings updated");
    } catch (e) {
      toast.error("Failed to update email settings");
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const { data } = await axios.post("/api/settings/test-smtp");
      if (data.success) {
        toast.success(data.message || "SMTP connection successful!");
      } else {
        toast.error(data.error || "SMTP connection failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "SMTP connection test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <SettingsContainer>
      <Section>
        <Typography variant="h6">Email Settings</Typography>
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
          label="SMTP User (email)"
          fullWidth
          margin="normal"
          value={emailSettings.smtpUser}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, smtpUser: e.target.value })
          }
        />
        <TextField
          label="SMTP Password"
          type="password"
          fullWidth
          margin="normal"
          value={emailSettings.smtpPassword}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })
          }
        />
        <TextField
          label="Port"
          type="number"
          fullWidth
          margin="normal"
          value={emailSettings.port}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, port: e.target.value })
          }
        />
        <TextField
          label="From Email"
          fullWidth
          margin="normal"
          value={emailSettings.fromEmail}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, fromEmail: e.target.value })
          }
        />
        <TextField
          label="From Name"
          fullWidth
          margin="normal"
          value={emailSettings.fromName}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, fromName: e.target.value })
          }
        />
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 2 }}
        >
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleTestConnection}
            disabled={testing || !emailSettings.smtpServer}
          >
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave}>
            Save Email Settings
          </Button>
        </Box>
      </Section>
    </SettingsContainer>
  );
};

export default EmailSettingsPage;
