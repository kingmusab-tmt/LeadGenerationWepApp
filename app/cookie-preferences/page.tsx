"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  Stack,
  List,
  ListItem,
  Paper,
  Typography,
  Alert,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import Link from "next/link";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";

const CookiePreferencesPage = () => {
  type CookieCategoryKey =
    | "essential"
    | "analytics"
    | "functional"
    | "advertising";

  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [functionalEnabled, setFunctionalEnabled] = useState(false);
  const [advertisingEnabled, setAdvertisingEnabled] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<
    Record<CookieCategoryKey, boolean>
  >({
    essential: false,
    analytics: false,
    functional: false,
    advertising: false,
  });

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

  useEffect(() => {
    const rawPrefs = getCookie("brix_cookie_preferences");
    if (!rawPrefs) return;

    try {
      const parsed = JSON.parse(rawPrefs) as {
        analytics?: boolean;
        functional?: boolean;
        advertising?: boolean;
      };
      setAnalyticsEnabled(Boolean(parsed.analytics));
      setFunctionalEnabled(Boolean(parsed.functional));
      setAdvertisingEnabled(Boolean(parsed.advertising));
    } catch {
      setAnalyticsEnabled(false);
      setFunctionalEnabled(false);
      setAdvertisingEnabled(false);
    }
  }, []);

  const handleSaveCookiePreferences = () => {
    const preferences = {
      essential: true,
      analytics: analyticsEnabled,
      functional: functionalEnabled,
      advertising: advertisingEnabled,
    };

    setCookie("brix_cookie_consent", "custom", 365);
    setCookie("brix_cookie_preferences", JSON.stringify(preferences), 365);
    setManageModalOpen(false);
  };

  const toggleDetailVisibility = (key: CookieCategoryKey) => {
    setExpandedDetails((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getCookieEnabledValue = (key: CookieCategoryKey) => {
    if (key === "essential") return true;
    if (key === "analytics") return analyticsEnabled;
    if (key === "functional") return functionalEnabled;
    return advertisingEnabled;
  };

  const handleCookieToggle = (key: CookieCategoryKey, checked: boolean) => {
    if (key === "essential") return;
    if (key === "analytics") {
      setAnalyticsEnabled(checked);
      return;
    }
    if (key === "functional") {
      setFunctionalEnabled(checked);
      return;
    }
    setAdvertisingEnabled(checked);
  };

  const cookieSections = [
    {
      title: "1) What Cookies and Similar Technologies Are",
      points: [
        "Cookies are small text files placed on your device to support website and platform functionality.",
        "We may also use similar technologies such as local storage, pixels, SDK identifiers, and server-side identifiers.",
        "These technologies help maintain sessions, remember preferences, measure performance, and improve service reliability.",
      ],
    },
    {
      title: "2) Cookie Categories We Use",
      points: [
        "Strictly Necessary: Required for core functionality such as authentication, security, and essential navigation.",
        "Performance and Analytics: Help us understand usage patterns, diagnose issues, and improve user experience.",
        "Functional: Remember your settings and platform preferences for a more personalized experience.",
        "Advertising/Targeting: Used to deliver relevant ads and measure campaign performance where enabled.",
      ],
    },
    {
      title: "3) UK/EU Cookie and Tracking Controls",
      points: [
        "For UK/EU users, non-essential cookies and similar technologies are used only with appropriate consent, where required by law.",
        "You can withdraw or modify non-essential consent choices at any time through available preference controls.",
        "Essential cookies remain active because they are required for core service operation and security.",
      ],
    },
    {
      title: "4) US Cookie and Privacy Controls",
      points: [
        "For US users, state privacy laws may provide rights related to targeted advertising and certain sharing/processing activities.",
        "You can manage preference choices through platform controls and browser-level settings where applicable.",
        "Some browser and device privacy signals may be honored where technically supported and legally required.",
      ],
    },
    {
      title: "5) Managing Cookie Preferences",
      points: [
        "Use your cookie controls to accept or reject non-essential categories.",
        "You can also configure browser settings to block or delete cookies; however, some features may not function correctly.",
        "Preference updates may take effect immediately or after page refresh/session renewal depending on technology type.",
      ],
    },
    {
      title: "6) Third-Party Technologies",
      points: [
        "Some cookies and tracking tools are provided by trusted partners such as analytics, payment, and messaging providers.",
        "Third-party providers may process data under their own policies, subject to contractual controls where applicable.",
        "We encourage users to review relevant third-party privacy notices for additional details.",
      ],
    },
    {
      title: "7) Data Retention for Cookie-Derived Information",
      points: [
        "Retention periods vary by cookie purpose, legal requirements, and operational necessity.",
        "Where possible, cookie-derived information is minimized, aggregated, or anonymized for analytics and performance use.",
        "We regularly review retention settings to align with legal and operational standards.",
      ],
    },
    {
      title: "8) Updates to Cookie Preferences",
      points: [
        "We may update cookie categories and disclosures as technologies, vendors, and legal requirements evolve.",
        "Material changes may be communicated through website notices or policy updates.",
        "Please revisit this page periodically to stay informed about current settings and options.",
      ],
    },
  ];

  return (
    <>
      <Header />
      <Box sx={{ py: { xs: 5, md: 8 }, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }} elevation={1}>
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Cookie Preferences
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Last updated: March 3, 2026
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => setManageModalOpen(true)}
              >
                Manage Cookies
              </Button>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Manage how cookies and related technologies are used across
              BRIXCOT, with transparency for UK/EU and US privacy expectations.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Preference controls impact non-essential cookies. Essential
              cookies required for security and core functionality remain
              active.
            </Alert>

            <Stack spacing={3}>
              {cookieSections.map((section) => (
                <Box key={section.title}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {section.title}
                  </Typography>
                  <List dense sx={{ pl: 2 }}>
                    {section.points.map((point) => (
                      <ListItem
                        key={point}
                        sx={{ display: "list-item", py: 0.3 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {point}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Stack>

            <Dialog
              open={manageModalOpen}
              onClose={() => setManageModalOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Manage Cookie Preferences</DialogTitle>
              <DialogContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Configure optional cookies used for analytics, functionality,
                  and advertising. Essential cookies remain enabled.
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
                            checked={getCookieEnabledValue(category.key)}
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
                <Button
                  onClick={() => setManageModalOpen(false)}
                  variant="outlined"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCookiePreferences}
                  variant="contained"
                >
                  Save Preferences
                </Button>
              </DialogActions>
            </Dialog>

            <Divider sx={{ my: 4 }} />

            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Related Legal Pages
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              flexWrap="wrap"
            >
              <MuiLink component={Link} href="/legal" underline="hover">
                Legal
              </MuiLink>
              <MuiLink
                component={Link}
                href="/terms-of-service"
                underline="hover"
              >
                Terms of Service
              </MuiLink>
              <MuiLink
                component={Link}
                href="/privacy-information"
                underline="hover"
              >
                Privacy Information
              </MuiLink>
              <MuiLink
                component={Link}
                href="/your-privacy-choices"
                underline="hover"
              >
                Your Privacy Choices
              </MuiLink>
              <MuiLink
                component={Link}
                href="/responsible-disclosure"
                underline="hover"
              >
                Responsible Disclosure
              </MuiLink>
              <MuiLink component={Link} href="/trust" underline="hover">
                Trust
              </MuiLink>
            </Stack>
          </Paper>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default CookiePreferencesPage;
