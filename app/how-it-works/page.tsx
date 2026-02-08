"use client";
import React from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Avatar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Head from "next/head";
import Link from "next/link";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";

const HowItWorksPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const steps = [
    {
      title: "Connect Your Sources",
      description:
        "Integrate with your website, social media, and advertising platforms",
      icon: "1",
    },
    {
      title: "Capture & Organize",
      description:
        "Our system automatically collects and categorizes your leads",
      icon: "2",
    },
    {
      title: "Distribute or Monetize",
      description: "Route leads to your team or sell them in our marketplace",
      icon: "3",
    },
    {
      title: "Analyze & Optimize",
      description: "Track performance and improve your conversion rates",
      icon: "4",
    },
  ];

  return (
    <>
      <Head>
        <title>How LeadConnect Pro Works | Smart Lead Management</title>
        <meta
          name="description"
          content="Discover how LeadConnect Pro transforms your lead management process"
        />
      </Head>
      <Header />

      {/* Hero Section */}
      <Box bgcolor={theme.palette.primary.main} color="white" py={10}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom align="center">
            How LeadConnect Pro Works
          </Typography>
          <Typography variant="h5" align="center">
            A simple, powerful solution to manage your leads efficiently
          </Typography>
        </Container>
      </Box>

      {/* Process Steps */}
      <Box py={10} bgcolor="background.default">
        <Container maxWidth="lg">
          <Stepper
            orientation={isMobile ? "vertical" : "horizontal"}
            alternativeLabel={!isMobile}
            sx={{ mb: 10 }}
          >
            {steps.map((step) => (
              <Step key={step.title}>
                <StepLabel>
                  <Typography variant="h6">{step.title}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Grid container spacing={6}>
            {steps.map((step, index) => (
              <Grid size={{ xs: 12, md: 3 }} key={index}>
                <Paper
                  elevation={3}
                  sx={{ p: 4, height: "100%", textAlign: "center" }}
                >
                  <Avatar
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      width: 64,
                      height: 64,
                      mb: 3,
                      mx: "auto",
                    }}
                  >
                    <Typography variant="h4" color="white">
                      {step.icon}
                    </Typography>
                  </Avatar>
                  <Typography variant="h6" gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Integration Section */}
      <Box py={10} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            Seamless Integrations
          </Typography>
          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            paragraph
          >
            Connect with the tools you already use
          </Typography>

          <Grid container spacing={4} mt={6} justifyContent="center">
            {["Zapier", "Facebook", "Google Ads"].map((integration) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={integration}>
                <Paper
                  elevation={2}
                  sx={{ p: 3, textAlign: "center", width: 150 }}
                >
                  <Box
                    component="img"
                    src={`/integrations/${integration
                      .toLowerCase()
                      .replace(" ", "-")}.png`}
                    alt={integration}
                    sx={{ height: 40, mb: 1 }}
                  />
                  <Typography>{integration}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={10} bgcolor="primary.main" color="white">
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h3" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="h5" paragraph>
            See how LeadConnect Pro can transform your lead management
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ mt: 4, px: 6, py: 2 }}
            component={Link}
            href="/demo"
          >
            Request a Demo
          </Button>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default HowItWorksPage;
