"use client";

import { Avatar, Box, Grid, Paper, Typography } from "@mui/material";
import {
  Analytics,
  AutoAwesome,
  Email,
  Groups,
  IntegrationInstructions,
  PhoneInTalk,
  Psychology,
  Shield,
  Sms,
  Storefront,
} from "@mui/icons-material";

const featureCards = [
  {
    icon: <Psychology color="primary" />,
    title: "AI Lead Scoring",
    description:
      "Automatically score and prioritize leads with AI-powered quality analysis.",
  },
  {
    icon: <PhoneInTalk color="primary" />,
    title: "Advanced Call Tracking",
    description:
      "Capture call performance with routing, transcription, recording, and analytics.",
  },
  {
    icon: <Email color="primary" />,
    title: "Email Automation",
    description:
      "Launch targeted email campaigns with scheduling and performance insights.",
  },
  {
    icon: <Sms color="primary" />,
    title: "SMS Campaigns",
    description:
      "Engage leads instantly with compliant SMS workflows and delivery tracking.",
  },
  {
    icon: <Storefront color="primary" />,
    title: "Lead Marketplace",
    description:
      "Buy and sell leads efficiently with wallet-based transactions and visibility controls.",
  },
  {
    icon: <IntegrationInstructions color="primary" />,
    title: "Integrations",
    description:
      "Connect your stack with Zapier, webhooks, and native API integrations.",
  },
  {
    icon: <AutoAwesome color="primary" />,
    title: "Smart Distribution",
    description:
      "Route leads by rules, geography, buyer settings, and availability in real time.",
  },
  {
    icon: <Analytics color="primary" />,
    title: "Real-Time Analytics",
    description:
      "Track lead, buyer, campaign, and conversion metrics from one dashboard.",
  },
  {
    icon: <Groups color="primary" />,
    title: "Buyer Management",
    description:
      "Manage buyer onboarding, approvals, balances, limits, and purchase behavior.",
  },
  {
    icon: <Shield color="primary" />,
    title: "Enterprise Security",
    description:
      "Protect operations with CSRF controls, encryption, and robust auth workflows.",
  },
];

export default function FeatureCardsGrid() {
  return (
    <Grid container spacing={3}>
      {featureCards.map((feature) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feature.title}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: "100%",
              transition: "all 0.2s ease",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
            }}
          >
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}>
                {feature.icon}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {feature.title}
              </Typography>
            </Box>
            <Typography color="text.secondary">
              {feature.description}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
