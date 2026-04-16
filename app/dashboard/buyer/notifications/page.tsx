"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

type NotificationItem = {
  _id: string;
  title?: string;
  message: string;
  status: "read" | "unread";
  createdAt?: string;
};

const BuyerNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=100");
      if (!response.ok) {
        throw new Error("Failed to load notifications");
      }

      const payload = await response.json();
      const items = payload?.data?.notifications;
      setNotifications(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    setUpdating(true);
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
      }

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          status: "read",
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update notifications",
      );
    } finally {
      setUpdating(false);
    }
  };

  const markOneAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to update notification");
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, status: "read" } : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update notification",
      );
    }
  };

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight={700}>
          Notifications
        </Typography>
        <Button
          variant="contained"
          onClick={markAllAsRead}
          disabled={updating || unreadCount === 0}
        >
          Mark All as Read
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <List>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText primary="No notifications yet." />
              </ListItem>
            ) : (
              notifications.map((item) => (
                <ListItem
                  key={item._id}
                  divider
                  secondaryAction={
                    item.status === "unread" ? (
                      <Button
                        size="small"
                        onClick={() => markOneAsRead(item._id)}
                      >
                        Mark Read
                      </Button>
                    ) : null
                  }
                  sx={{
                    bgcolor:
                      item.status === "unread" ? "action.hover" : "inherit",
                  }}
                >
                  <ListItemText
                    primary={item.title || "Notification"}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          display="block"
                        >
                          {item.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : ""}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default BuyerNotificationsPage;
