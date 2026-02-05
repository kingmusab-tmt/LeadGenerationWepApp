/**
 * API Key Management Component
 * Manage API keys for external integrations
 *
 * Date: January 21, 2026
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface Props {
  onNotify: (
    message: string,
    severity?: "success" | "error" | "info" | "warning",
  ) => void;
}

export default function ApiKeyManagement({ onNotify }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyExists, setApiKeyExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier/api-key");
      if (res.ok) {
        const data = await res.json();
        setApiKeyExists(data.exists);
        setCreatedAt(data.createdAt);
      }
    } catch (error) {
      console.error("Failed to check API key:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier/api-key", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setApiKeyExists(true);
        setShowKey(true);
        onNotify(
          "API key generated! Save it now - it won't be shown again.",
          "warning",
        );
      } else {
        const error = await res.json();
        onNotify(error.error || "Failed to generate API key", "error");
      }
    } catch (error) {
      onNotify("Failed to generate API key", "error");
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async () => {
    if (
      !confirm(
        "Are you sure? This will break all existing integrations using this key.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier/api-key", {
        method: "DELETE",
      });

      if (res.ok) {
        setApiKey(null);
        setApiKeyExists(false);
        setCreatedAt(null);
        onNotify("API key revoked successfully", "success");
      } else {
        onNotify("Failed to revoke API key", "error");
      }
    } catch (error) {
      onNotify("Failed to revoke API key", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      onNotify("API key copied to clipboard", "success");
    }
  };

  if (loading && !apiKeyExists) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          API Key Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage API keys for Zapier Actions and other integrations
        </Typography>
      </Box>

      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        API keys allow external services like Zapier to perform actions in
        BRIXCOT. Keep your keys secure and never share them publicly.
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Zapier Actions API Key
          </Typography>

          {apiKeyExists ? (
            <Box>
              {apiKey ? (
                <>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Important:</strong> Save this key securely - it
                    won't be shown again after you leave this page!
                  </Alert>

                  <TextField
                    fullWidth
                    label="Your API Key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? (
                              <VisibilityOffIcon />
                            ) : (
                              <VisibilityIcon />
                            )}
                          </IconButton>
                          <IconButton size="small" onClick={copyToClipboard}>
                            <CopyIcon />
                          </IconButton>
                        </Box>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                </>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  API key is active and configured
                  {createdAt && (
                    <>
                      <br />
                      Created: {new Date(createdAt).toLocaleString()}
                    </>
                  )}
                </Alert>
              )}

              <Button
                variant="outlined"
                color="error"
                onClick={revokeApiKey}
                disabled={loading}
                fullWidth
              >
                Revoke API Key
              </Button>
            </Box>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                No API key configured yet. Generate one to use Zapier actions
                and other API integrations.
              </Alert>

              <Button
                variant="contained"
                onClick={generateApiKey}
                disabled={loading}
                fullWidth
              >
                Generate API Key
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            How to Use
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="1. Generate API Key"
                secondary="Click the button above to create a new key"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Copy and Save"
                secondary="Store the key securely - you won't see it again"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. Configure Zapier"
                secondary="In Zapier, add BRIXCOT action and paste the API key"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="4. Test Integration"
                secondary="Send a test request to verify the connection"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Security Best Practices
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="• Never share your API key publicly or in version control" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Revoke keys immediately if compromised" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Generate new keys periodically for security" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Monitor API usage for unusual activity" />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
