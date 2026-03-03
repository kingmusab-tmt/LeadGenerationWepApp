"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Box,
  Typography,
  Paper,
  Tooltip,
  useTheme,
  useMediaQuery,
  Link,
  Alert,
  CircularProgress,
} from "@mui/material";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import backgroundImage from "@/public/images/bg2 (1).jpg";
import Logo from "@/public/images/5ae9cfb6c909a_thumb900.png"; // Replace with your actual logo import
import TermsOfServiceDialog from "@/app/components/legal/TermsOfServiceDialog";
import PrivacyPolicyDialog from "@/app/components/legal/PrivacyPolicyDialog";

interface SignInPageProps {
  callbackUrl?: string;
}

export const SignInPage: React.FC<SignInPageProps> = () => {
  const [loading, setLoading] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [trialIntent, setTrialIntent] = useState(false);
  const theme = useTheme();
  const isMobileQuery = useMediaQuery(theme.breakpoints.down("sm"));
  const searchParams = useSearchParams();

  // Use a state for isMobile that only updates after mount to prevent hydration mismatch
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsMobile(isMobileQuery);

    // Check for trial intent from URL params or session storage
    const trialParam = searchParams.get("trial");
    if (trialParam === "true") {
      setTrialIntent(true);
      // Store in sessionStorage to persist through OAuth flow
      sessionStorage.setItem("trialIntent", "true");
    } else if (sessionStorage.getItem("trialIntent") === "true") {
      setTrialIntent(true);
    }
  }, [isMobileQuery, searchParams]);

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn("google").finally(() => setLoading(false));
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: isMobile ? 2 : 4,
        overflow: "hidden",
      }}
    >
      {/* Background Image */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
        }}
      >
        <Image
          src={backgroundImage}
          alt="Background"
          fill
          style={{ objectFit: "cover" }}
          priority
          quality={80}
        />
      </Box>

      <Paper
        elevation={6}
        sx={{
          p: isMobile ? 3 : 4,
          width: "100%",
          maxWidth: 450,
          borderRadius: 4,
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: isMobile ? 80 : 120,
            height: isMobile ? 80 : 120,
            position: "relative",
          }}
        >
          <Image
            src={Logo}
            alt="Company Logo"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </Box>

        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            background: "linear-gradient(45deg, #1976d2, #00bcd4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center",
          }}
        >
          {trialIntent ? "Start Your Free Trial" : "Welcome"}
        </Typography>

        {trialIntent && (
          <Alert severity="info" sx={{ width: "100%", mb: 1 }}>
            Sign in to start your <strong>14-day free trial</strong> with full
            access to all features. No credit card required!
          </Alert>
        )}

        <Typography variant="body1" sx={{ textAlign: "center", mb: 2 }}>
          {trialIntent
            ? "Create an account or sign in with Google to begin"
            : "Sign in or create an account with Google to get started"}
        </Typography>

        <Tooltip
          title={
            loading
              ? "Processing..."
              : "Sign in/sign up with your Google account"
          }
          arrow
        >
          <span style={{ width: "100%" }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={!loading && <FcGoogle size={24} />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: "none",
                fontSize: isMobile ? "0.875rem" : "1rem",
                fontWeight: 500,
                boxShadow: theme.shadows[2],
                "&:hover": {
                  boxShadow: theme.shadows[4],
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Sign-in/Sign-up with Google"
              )}
            </Button>
          </span>
        </Tooltip>

        <Typography
          variant="caption"
          sx={{
            mt: 2,
            color: "text.secondary",
            textAlign: "center",
            display: "block",
          }}
        >
          By continuing, you agree to our{" "}
          <Link
            component="button"
            variant="caption"
            onClick={() => setOpenTerms(true)}
            sx={{ fontWeight: 600 }}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            component="button"
            variant="caption"
            onClick={() => setOpenPrivacy(true)}
            sx={{ fontWeight: 600 }}
          >
            Privacy Policy
          </Link>
        </Typography>
      </Paper>

      <TermsOfServiceDialog
        open={openTerms}
        onClose={() => setOpenTerms(false)}
      />
      <PrivacyPolicyDialog
        open={openPrivacy}
        onClose={() => setOpenPrivacy(false)}
      />
    </Box>
  );
};

export default SignInPage;
