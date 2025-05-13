"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

const InactivityLogout = () => {
  const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour
  const AUTO_LOGOUT_COUNTDOWN = 30 * 1000; // 30 seconds

  const logoutTimer = useRef<NodeJS.Timeout | null>(null);
  const modalTimer = useRef<NodeJS.Timeout | null>(null);

  const [showModal, setShowModal] = useState(false);

  const resetInactivityTimer = () => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (modalTimer.current) clearTimeout(modalTimer.current);
    setShowModal(false);

    logoutTimer.current = setTimeout(() => {
      // Show modal after 1 hour of inactivity
      setShowModal(true);

      modalTimer.current = setTimeout(() => {
        // Auto logout if no user response in 30 seconds
        handleLogout();
      }, AUTO_LOGOUT_COUNTDOWN);
    }, INACTIVITY_LIMIT);
  };

  const handleLogout = () => {
    setShowModal(false);
    signOut({ callbackUrl: "/auth/sign-in" });
  };

  const handleContinue = () => {
    resetInactivityTimer();
  };

  useEffect(() => {
    const activityEvents = [
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "touchstart",
    ];

    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity)
    );

    resetInactivityTimer();

    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (modalTimer.current) clearTimeout(modalTimer.current);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, []);

  return (
    <Dialog open={showModal}>
      <DialogTitle>Session Timeout</DialogTitle>
      <DialogContent>
        <Typography>
          You've been inactive for a while. For your security, you'll be logged
          out soon.
        </Typography>
        <Typography mt={1} fontWeight="bold">
          Do you want to continue your session?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleLogout} color="error">
          OK
        </Button>
        <Button onClick={handleContinue} color="primary" autoFocus>
          Continue Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InactivityLogout;
