"use client";
import React, { useEffect, useRef, useCallback } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { removeNotification } from "@/lib/uiSlice";

const NotificationManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);
  const displayedRef = useRef<Set<string>>(new Set());

  const handleClose = useCallback(
    (notificationId: string) => {
      displayedRef.current.delete(notificationId);
      dispatch(removeNotification(notificationId));
    },
    [dispatch],
  );

  // Auto-remove notifications after 6 seconds — no state updates, no re-render loop
  useEffect(() => {
    notifications.forEach((notification) => {
      if (!displayedRef.current.has(notification.id)) {
        displayedRef.current.add(notification.id);

        setTimeout(() => {
          handleClose(notification.id);
        }, 6000);
      }
    });
  }, [notifications, handleClose]);

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
