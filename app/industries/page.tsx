"use client";
import React from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  Paper,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Head from "next/head";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";

const IndustryPage = () => {
  const searchParams = useSearchParams();
  const industry = searchParams.get("industry");

  // Industry data - in a real app this would come from an API or CMS
  const industryData = {
    "real-estate": {
      title: "Real Estate Professionals",
      heroImage: "/industries/real-estate-hero.jpg",
      description:
        "Maximize your lead conversion and grow your real estate business",
      features: [
        "Automated lead routing to agents",
        "Open house visitor tracking",
        "CRM integrations",
        "Lead scoring and prioritization",
        "Marketplace for excess leads",
      ],
      testimonials: [
        {
          name: "Sarah Johnson",
          company: "Premier Realty",
          quote: "Increased our conversions by 35% in just 3 months",
        },
      ],
    },
    insurance: {
      title: "Insurance Agencies",
      heroImage: "/industries/insurance-hero.jpg",
      description: "Streamline your insurance lead management",
      features: [
        "Quote request management",
        "Agent performance tracking",
        "Compliance tools",
        "Automated follow-ups",
        "Lead quality scoring",
      ],
    },
    solar: {
      title: "Solar Companies",
      heroImage: "/industries/solar-hero.jpg",
      description: "Convert more solar leads with less effort",
      features: [
        "Appointment scheduling",
        "ROI calculators",
        "Partner network access",
        "Automated qualification",
        "Performance analytics",
      ],
    },
  };

  const data = industryData[industry as keyof typeof industryData] || {
    title: "Industry Solutions",
    description: "Custom lead management for your business",
    features: [],
  };

  return (
    <>
      <Head>
        <title>{data.title} | LeadConnect Pro</title>
        <meta name="description" content={data.description} />
      </Head>
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${data.heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "white",
          py: 15,
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom>
            {data.title}
          </Typography>
          <Typography variant="h4" paragraph>
            {data.description}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ mt: 4 }}
            component={Link}
            href="/demo"
          >
            Get Industry-Specific Demo
          </Button>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={10} bgcolor="background.default">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            {data.title} Features
          </Typography>

          <Grid container spacing={6} mt={6}>
            <Grid item xs={12} md={6}>
              <List>
                {data.features.map((feature, index) => (
                  <ListItem key={index} disableGutters sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <CheckCircleIcon color="primary" fontSize="large" />
                    </ListItemIcon>
                    <Typography variant="h6">{feature}</Typography>
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3, height: "100%" }}>
                <Typography variant="h5" gutterBottom>
                  Why {data.title.split(" ")[0]} Choose LeadConnect Pro?
                </Typography>
                <Typography paragraph>
                  Our platform is specifically designed to address the unique
                  challenges faced by {data.title.toLowerCase()} when managing
                  leads.
                </Typography>
                <Typography paragraph>
                  From automated workflows to industry-specific reporting, we
                  provide the tools you need to convert more leads with less
                  effort.
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ mt: 2 }}
                  component={Link}
                  href="/case-studies"
                >
                  View Case Studies
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={10} bgcolor="primary.main" color="white">
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h3" gutterBottom>
            Ready to See It in Action?
          </Typography>
          <Typography variant="h5" paragraph>
            Our {industry} specialists can show you exactly how LeadConnect Pro
            works for your business
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ mt: 4, px: 6, py: 2 }}
            component={Link}
            href="/demo"
          >
            Schedule a Demo
          </Button>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default IndustryPage;
