"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
  Avatar,
} from "@mui/material";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import NotificationImportantOutlined from "@mui/icons-material/NotificationImportantOutlined";
import EmptyState from "./EmptyState";

type NotificationItem = {
  _id: string;
  type: "info" | "alert";
  title?: string;
  message: string;
  status: "read" | "unread";
  createdAt?: string;
};

type FilterValue = "all" | "unread" | "alert" | "info";

function dateBucket(dateString?: string): string {
  if (!dateString) return "Earlier";
  const date = new Date(dateString);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This week";
  return "Earlier";
}

const BUCKET_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

/**
 * Shared notification inbox used by both the seller and buyer dashboards.
 * Backed by /api/notifications — grouped by day and filterable by the one
 * categorical field the backend actually populates today (type: info/alert).
 * relatedEntityType/actionUrl exist on the schema but no notification sender
 * currently sets them, so there's no data yet to link a notification back to
 * its source lead/call/campaign — that's a backend follow-up, not a UI gap.
 */
export default function NotificationInbox() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<FilterValue>("all");

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=100");
      if (!response.ok) {
        throw new Error("Failed to load notifications");
      }
      const payload = await response.json();
      const items = payload?.data?.notifications;
      setNotifications(Array.isArray(items) ? items : []);
      setError(null);
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
        prev.map((item) => ({ ...item, status: "read" as const })),
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
    // Optimistic update — the list shouldn't jump/reflow while the request is in flight.
    setNotifications((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, status: "read" as const } : item,
      ),
    );
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to update notification");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update notification",
      );
    }
  };

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => n.status === "unread");
      case "alert":
        return notifications.filter((n) => n.type === "alert");
      case "info":
        return notifications.filter((n) => n.type === "info");
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, NotificationItem[]>();
    for (const item of filtered) {
      const bucket = dateBucket(item.createdAt);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(item);
    }
    return BUCKET_ORDER.filter((b) => buckets.has(b)).map((bucket) => ({
      bucket,
      items: buckets.get(bucket)!,
    }));
  }, [filtered]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h5" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} unread`}
              size="small"
              color="primary"
            />
          )}
        </Stack>
        <Button
          variant="outlined"
          onClick={markAllAsRead}
          disabled={updating || unreadCount === 0}
        >
          Mark all as read
        </Button>
      </Stack>

      <Tabs
        value={filter}
        onChange={(_e, value: FilterValue) => setFilter(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="All" value="all" />
        <Tab label="Unread" value="unread" />
        <Tab label="Alerts" value="alert" />
        <Tab label="Info" value="info" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="Nothing here yet — new activity on your leads, calls, and campaigns will show up in this list."
        />
      ) : (
        <Stack spacing={3}>
          {grouped.map(({ bucket, items }) => (
            <Box key={bucket}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: "0.08em" }}
              >
                {bucket}
              </Typography>
              <List sx={{ bgcolor: "background.paper", borderRadius: 2 }}>
                {items.map((item) => (
                  <ListItem
                    key={item._id}
                    divider
                    secondaryAction={
                      item.status === "unread" ? (
                        <Button
                          size="small"
                          onClick={() => markOneAsRead(item._id)}
                        >
                          Mark read
                        </Button>
                      ) : null
                    }
                    sx={{
                      bgcolor:
                        item.status === "unread"
                          ? "action.hover"
                          : "transparent",
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor:
                            item.type === "alert"
                              ? "warning.main"
                              : "info.main",
                          width: 36,
                          height: 36,
                        }}
                      >
                        {item.type === "alert" ? (
                          <NotificationImportantOutlined fontSize="small" />
                        ) : (
                          <InfoOutlined fontSize="small" />
                        )}
                      </Avatar>
                    </ListItemAvatar>
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
                ))}
              </List>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
