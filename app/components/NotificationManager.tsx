"use client";
import React, { useEffect, useState } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { removeNotification } from "@/lib/uiSlice";

const NotificationManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);
  const [displayedNotifications, setDisplayedNotifications] = useState<
    Map<string, boolean>
  >(new Map());

  const handleClose = (notificationId: string) => {
    dispatch(removeNotification(notificationId));
  };

  // Auto-remove notifications after 6 seconds
  useEffect(() => {
    notifications.forEach((notification) => {
      if (!displayedNotifications.has(notification.id)) {
        const newMap = new Map(displayedNotifications);
        newMap.set(notification.id, true);
        setDisplayedNotifications(newMap);

        // Auto-close after 6 seconds
        setTimeout(() => {
          handleClose(notification.id);
        }, 6000);
      }
    });
  }, [notifications, displayedNotifications]);

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          autoHideDuration={6000}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.severity as AlertColor}
            sx={{ width: "100%", minWidth: 300 }}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default NotificationManager;
