"use client";

import { useState } from "react";
import { useTransition } from "react";
import { signIn } from "next-auth/react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Container,
  Paper,
  Tooltip,
} from "@mui/material";
import { FcGoogle } from "react-icons/fc";
import { handleEmailSignIn } from "@/lib/emailSignInServerAction";
import Image from "next/image";
import backgroundImage from "@/public/images/bg2 (1).jpg"; // Add your background image here
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

export const SignInPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ email: "" as string });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      startTransition(async () => {
        await handleEmailSignIn(formData.email);
        setLoading(false);
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          display: { xs: "block", md: "flex" },
          height: "100%",
          width: "100%",
        }}
      >
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            flex: 1,
            position: "relative",
          }}
        >
          <Image
            src={backgroundImage}
            alt="Background"
            layout="fill"
            objectFit="cover"
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <Paper
            elevation={6}
            sx={{ padding: 4, width: "100%", maxWidth: 400 }}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              Sign In
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ email: event.target.value })
                }
                disabled={isPending}
              />
              <Tooltip
                title={loading ? "Processing..." : "Sign in with your email"}
                arrow
              >
                <span>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={isPending || loading}
                    startIcon={loading && <LoadingComponent />}
                  >
                    Sign in with email
                  </Button>
                </span>
              </Tooltip>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mt: 2,
                }}
              >
                <Typography variant="body2" sx={{ mx: 2 }}>
                  or
                </Typography>
              </Box>
              <Tooltip
                title={
                  loading ? "Processing..." : "Sign in with your Google account"
                }
                arrow
              >
                <span>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    startIcon={<FcGoogle />}
                    onClick={() => {
                      setLoading(true);
                      signIn("google").finally(() => setLoading(false));
                    }}
                    sx={{ mt: 2 }}
                    disabled={isPending || loading}
                  >
                    {loading ? <LoadingComponent /> : "Sign in with Google"}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default SignInPage;
