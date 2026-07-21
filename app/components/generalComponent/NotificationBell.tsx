"use client";

import { useEffect, useState } from "react";
import { Badge, IconButton, SxProps, Theme } from "@mui/material";
import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";

/**
 * Unread-count bell for dashboard app bars. Polls /api/notifications
 * (which already returns unreadCount alongside the list) rather than
 * requiring a dedicated count endpoint.
 */
export default function NotificationBell({
  onClick,
  sx,
}: {
  onClick: () => void;
  sx?: SxProps<Theme>;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications?limit=1");
        if (!res.ok) return;
        const payload = await res.json();
        if (!cancelled) {
          setUnreadCount(payload?.data?.unreadCount ?? 0);
        }
      } catch {
        // Non-critical — the badge just skips this refresh cycle.
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    const onFocus = () => fetchUnread();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <IconButton
      onClick={onClick}
      aria-label={
        unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
      sx={sx}
    >
      <Badge badgeContent={unreadCount} color="error" max={99}>
        <NotificationsOutlined />
      </Badge>
    </IconButton>
  );
}
