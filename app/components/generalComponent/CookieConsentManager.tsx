"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

type CookiePrefs = {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  advertising: boolean;
};

type CookieCategoryKey =
  | "essential"
  | "analytics"
  | "functional"
  | "advertising";

const CONSENT_COOKIE = "brix_cookie_consent";
const PREFS_COOKIE = "brix_cookie_preferences";
const VISIT_COOKIE = "brix_first_visit";
const SESSION_COOKIE = "brix_session_id";

const defaultPrefs: CookiePrefs = {
  essential: true,
  analytics: false,
  functional: false,
  advertising: false,
};

const cookieCategoryDetails: {
  key: CookieCategoryKey;
  label: string;
  details: string[];
}[] = [
  {
    key: "essential",
    label: "Essential cookies (always on)",
    details: [
      "brix_cookie_consent: stores your consent mode (accepted_all, essential_only, custom).",
      "brix_cookie_preferences: stores your selected cookie category preferences.",
      "brix_first_visit: records first-visit timestamp for consent lifecycle tracking.",
      "brix_session_id: stores a short-lived session identifier for visit/session continuity.",
      "csrfToken (when present): supports CSRF protection for secure requests.",
    ],
  },
  {
    key: "analytics",
    label: "Analytics cookies",
    details: [
      "Enabled only when you opt in.",
      "Used to measure traffic, page performance, and product usage patterns.",
      "Analytics tooling may set provider cookies when analytics integrations are active.",
    ],
  },
  {
    key: "functional",
    label: "Functional cookies",
    details: [
      "Enabled only when you opt in.",
      "Used to remember non-essential UI preferences and personalization settings.",
      "May include preference keys from optional integrations/features you enable.",
    ],
  },
  {
    key: "advertising",
    label: "Advertising cookies",
    details: [
      "Enabled only when you opt in.",
      "Used for campaign attribution, ad relevance, and conversion tracking.",
      "Advertising/retargeting providers may set cookies only if related integrations are active.",
    ],
  },
];

const setCookie = (name: string, value: string, days = 365) => {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const safeParsePrefs = (value: string | null): CookiePrefs => {
  if (!value) return defaultPrefs;

  try {
    const parsed = JSON.parse(value) as Partial<CookiePrefs>;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      functional: Boolean(parsed.functional),
      advertising: Boolean(parsed.advertising),
    };
  } catch {
    return defaultPrefs;
  }
};

const CookieConsentManager = () => {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>(defaultPrefs);
  const [expandedDetails, setExpandedDetails] = useState<
    Record<CookieCategoryKey, boolean>
  >({
    essential: false,
    analytics: false,
    functional: false,
    advertising: false,
  });

  const sessionId = useMemo(
    () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!getCookie(VISIT_COOKIE)) {
      setCookie(VISIT_COOKIE, new Date().toISOString(), 365);
    }

    if (!getCookie(SESSION_COOKIE)) {
      setCookie(SESSION_COOKIE, sessionId, 1);
    }

    const existingConsent = getCookie(CONSENT_COOKIE);
    const existingPrefs = safeParsePrefs(getCookie(PREFS_COOKIE));
    setPrefs(existingPrefs);

    if (!existingConsent) {
      setOpen(true);
    }
  }, [sessionId]);

  useEffect(() => {
    const handleOpenPreferences = () => {
      const existingPrefs = safeParsePrefs(getCookie(PREFS_COOKIE));
      setPrefs(existingPrefs);
      setOpen(true);
    };

    window.addEventListener("open-cookie-preferences", handleOpenPreferences);

    return () => {
      window.removeEventListener(
        "open-cookie-preferences",
        handleOpenPreferences,
      );
    };
  }, []);

  const handleAcceptAll = () => {
    const allPrefs: CookiePrefs = {
      essential: true,
      analytics: true,
      functional: true,
      advertising: true,
    };

    setPrefs(allPrefs);
    setCookie(CONSENT_COOKIE, "accepted_all", 365);
    setCookie(PREFS_COOKIE, JSON.stringify(allPrefs), 365);
    setOpen(false);
  };

  const handleEssentialOnly = () => {
    setPrefs(defaultPrefs);
    setCookie(CONSENT_COOKIE, "essential_only", 365);
    setCookie(PREFS_COOKIE, JSON.stringify(defaultPrefs), 365);
    setOpen(false);
  };

  const handleSaveCustom = () => {
    const customPrefs: CookiePrefs = {
      essential: true,
      analytics: prefs.analytics,
      functional: prefs.functional,
      advertising: prefs.advertising,
    };

    setCookie(CONSENT_COOKIE, "custom", 365);
    setCookie(PREFS_COOKIE, JSON.stringify(customPrefs), 365);
    setOpen(false);
  };

  const toggleDetailVisibility = (key: CookieCategoryKey) => {
    setExpandedDetails((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCookieToggle = (key: CookieCategoryKey, checked: boolean) => {
    if (key === "essential") return;

    setPrefs((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Cookie Preferences</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          We use cookies to keep the site secure and improve your experience.
          You can choose which optional cookie categories to enable.
        </Typography>

        <Stack spacing={1.5}>
          {cookieCategoryDetails.map((category) => (
            <Box
              key={category.key}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                p: 1.2,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs[category.key]}
                    disabled={category.key === "essential"}
                    onChange={(e) =>
                      handleCookieToggle(category.key, e.target.checked)
                    }
                  />
                }
                label={category.label}
              />
              <Button
                size="small"
                onClick={() => toggleDetailVisibility(category.key)}
                endIcon={
                  expandedDetails[category.key] ? (
                    <ExpandLess />
                  ) : (
                    <ExpandMore />
                  )
                }
                sx={{ ml: 1, textTransform: "none" }}
              >
                {expandedDetails[category.key]
                  ? "Hide details"
                  : "Show details"}
              </Button>
              <Collapse in={expandedDetails[category.key]}>
                <Box sx={{ mt: 1, pl: 1.5 }}>
                  {category.details.map((detail) => (
                    <Typography
                      key={detail}
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      • {detail}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleEssentialOnly} variant="outlined">
          Essential Only
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleSaveCustom} variant="outlined">
          Save Preferences
        </Button>
        <Button onClick={handleAcceptAll} variant="contained">
          Accept All
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CookieConsentManager;
