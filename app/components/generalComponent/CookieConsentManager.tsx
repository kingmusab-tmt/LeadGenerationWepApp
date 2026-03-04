"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  FormControlLabel,
  Paper,
  Slide,
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

const allAcceptedPrefs: CookiePrefs = {
  essential: true,
  analytics: true,
  functional: true,
  advertising: true,
};

const defaultPrefs = allAcceptedPrefs;

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

const getStorage = (key: string): string | null => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const setStorage = (key: string, value: string) => {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {
    /* localStorage unavailable — cookie is still set */
  }
};

const getConsent = (name: string): string | null =>
  getCookie(name) || getStorage(name);

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
  const [showDetails, setShowDetails] = useState(false);
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

  /* ---- visit / session cookies (independent of consent) ---- */
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!getCookie(VISIT_COOKIE)) {
      setCookie(VISIT_COOKIE, new Date().toISOString(), 365);
    }

    if (!getCookie(SESSION_COOKIE)) {
      setCookie(SESSION_COOKIE, sessionId, 1);
    }
  }, [sessionId]);

  /* ---- consent check (runs once on mount) ---- */
  useEffect(() => {
    if (typeof document === "undefined") return;

    const existingConsent = getConsent(CONSENT_COOKIE);
    const rawPrefs = getConsent(PREFS_COOKIE);
    const existingPrefs = safeParsePrefs(rawPrefs);
    setPrefs(existingPrefs);

    if (existingConsent) {
      /* Re-sync cookie if it was cleared but localStorage survived */
      if (!getCookie(CONSENT_COOKIE)) {
        setCookie(CONSENT_COOKIE, existingConsent, 365);
      }
      if (rawPrefs && !getCookie(PREFS_COOKIE)) {
        setCookie(PREFS_COOKIE, rawPrefs, 365);
      }
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const handleOpenPreferences = () => {
      const existingPrefs = safeParsePrefs(getCookie(PREFS_COOKIE));
      setPrefs(existingPrefs);
      setShowDetails(true);
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

  const persistConsent = (mode: string, cookiePrefs: CookiePrefs) => {
    const prefsJson = JSON.stringify(cookiePrefs);
    setCookie(CONSENT_COOKIE, mode, 365);
    setCookie(PREFS_COOKIE, prefsJson, 365);
    setStorage(CONSENT_COOKIE, mode);
    setStorage(PREFS_COOKIE, prefsJson);
  };

  const handleAcceptAll = () => {
    setPrefs(allAcceptedPrefs);
    persistConsent("accepted_all", allAcceptedPrefs);
    setShowDetails(false);
    setOpen(false);
  };

  const essentialOnlyPrefs: CookiePrefs = {
    essential: true,
    analytics: false,
    functional: false,
    advertising: false,
  };

  const handleEssentialOnly = () => {
    setPrefs(essentialOnlyPrefs);
    persistConsent("essential_only", essentialOnlyPrefs);
    setShowDetails(false);
    setOpen(false);
  };

  const handleSaveCustom = () => {
    const customPrefs: CookiePrefs = {
      essential: true,
      analytics: prefs.analytics,
      functional: prefs.functional,
      advertising: prefs.advertising,
    };

    persistConsent("custom", customPrefs);
    setShowDetails(false);
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
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1400,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
          {/* ---- Compact view (always visible) ---- */}
          <Typography variant="body2" color="text.secondary">
            By continuing to use our website, you acknowledge the use of cookies
          </Typography>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Button
              size="small"
              onClick={() => setShowDetails((prev) => !prev)}
              endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
              sx={{ textTransform: "none" }}
            >
              {showDetails ? "View Less" : "View More"}
            </Button>

            <Box sx={{ flex: 1 }} />

            <Button onClick={handleAcceptAll} variant="contained" size="small">
              Accept All
            </Button>
          </Stack>

          {/* ---- Expanded details ---- */}
          <Collapse in={showDetails}>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
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

            <Stack
              direction="row"
              spacing={1.5}
              justifyContent="flex-end"
              sx={{ mt: 2 }}
            >
              <Button
                onClick={handleEssentialOnly}
                variant="outlined"
                size="small"
              >
                Essential Only
              </Button>
              <Button
                onClick={handleSaveCustom}
                variant="outlined"
                size="small"
              >
                Save Preferences
              </Button>
              <Button
                onClick={handleAcceptAll}
                variant="contained"
                size="small"
              >
                Accept All
              </Button>
            </Stack>
          </Collapse>
        </Box>
      </Paper>
    </Slide>
  );
};

export default CookieConsentManager;
