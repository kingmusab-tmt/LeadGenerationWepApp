"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  Divider,
  useMediaQuery,
  useTheme,
  Stack,
  Paper,
  Avatar,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhoneIcon from "@mui/icons-material/Phone";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import BuildIcon from "@mui/icons-material/Build";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";

interface Tier {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
}

const LandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const response = await fetch("/api/tiers");
        if (!response.ok) {
          throw new Error("Failed to fetch pricing tiers");
        }
        const data = await response.json();
        setTiers(data.filter((tier: Tier) => tier.isActive)); // Only show active tiers
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
  }, []);

  const features = [
    {
      icon: <PhoneIcon color="primary" />,
      text: "Twilio Phone Number Integration",
    },
    { icon: <PeopleIcon color="primary" />, text: "Lead Buyer Management" },
    { icon: <MonetizationOnIcon color="primary" />, text: "Lead Marketplace" },
    { icon: <BuildIcon color="primary" />, text: "Custom Form Builder" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Real Estate Agency Owner",
      text: "Increased our lead conversion by 40% in just 2 months!",
      avatar: "/avatars/1.jpg",
    },
    {
      name: "Michael Chen",
      role: "Insurance Broker",
      text: "The automated lead distribution saves us hours every week.",
      avatar: "/avatars/2.jpg",
    },
    {
      name: "David Wilson",
      role: "Solar Sales Director",
      text: "Best ROI of any marketing tool we use. Pays for itself in days.",
      avatar: "/avatars/3.jpg",
    },
  ];

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // if (error) {
  //   return (
  //     <Box
  //       display="flex"
  //       justifyContent="center"
  //       alignItems="center"
  //       minHeight="100vh"
  //     >
  //       <Typography color="error">{error}</Typography>
  //     </Box>
  //   );
  // }

  return (
    <>
      {/* Header Section */}
      <Header />

      {/* Hero Section */}
      <Box bgcolor={theme.palette.primary.main} color="white" py={10}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Transform Your Lead Management
              </Typography>
              <Typography variant="h5" gutterBottom>
                Capture, manage, and distribute leads efficiently with our
                all-in-one platform
              </Typography>
              <Stack direction="row" spacing={2} mt={4}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  href="#pricing"
                >
                  View Plans
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  href="/demo"
                >
                  Free Trial
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/images/lead-dashboard.png"
                alt="Lead Management Dashboard"
                sx={{
                  width: "100%",
                  borderRadius: 2,
                  boxShadow: 6,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={10} bgcolor="background.paper" id="features">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            Powerful Features
          </Typography>
          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            paragraph
          >
            Everything you need to manage your leads effectively
          </Typography>

          <Grid container spacing={4} mt={6}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper elevation={3} sx={{ p: 3, height: "100%" }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar
                      sx={{ bgcolor: theme.palette.primary.light, mr: 2 }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Typography variant="h6">{feature.text}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore.
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box py={10} bgcolor="background.paper" id="pricing">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            Simple, Transparent Pricing
          </Typography>
          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            paragraph
          >
            Choose the plan that fits your business needs
          </Typography>

          {tiers.length > 0 ? (
            <Grid container spacing={4} mt={6} alignItems="stretch">
              {tiers.map((tier) => (
                <Grid item xs={12} md={4} key={tier.id}>
                  <Card
                    sx={{
                      height: "100%",
                      border: tier.highlight
                        ? `2px solid ${theme.palette.primary.main}`
                        : undefined,
                      transform:
                        tier.highlight && !isMobile ? "scale(1.05)" : undefined,
                      transition: "transform 0.3s ease-in-out",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {tier.highlight && (
                      <Box
                        bgcolor="primary.main"
                        color="primary.contrastText"
                        textAlign="center"
                        py={1}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">
                          MOST POPULAR
                        </Typography>
                      </Box>
                    )}

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" component="h2" gutterBottom>
                        {tier.name}
                      </Typography>
                      <Typography variant="h3" component="div" gutterBottom>
                        {tier.price}
                        <Typography
                          component="span"
                          variant="h6"
                          color="text.secondary"
                        >
                          /month
                        </Typography>
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        paragraph
                      >
                        {tier.description}
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      <List dense>
                        {tier.features.map((feature, index) => (
                          <ListItem key={index} disableGutters>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            </ListItemIcon>
                            <ListItemText primary={feature} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>

                    <CardActions sx={{ p: 2 }}>
                      <Button
                        fullWidth
                        variant={tier.highlight ? "contained" : "outlined"}
                        color={tier.highlight ? "primary" : "inherit"}
                        size="large"
                        href={`/signup?plan=${tier.id}`}
                      >
                        {tier.ctaText}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography align="center" color="text.secondary" mt={4}>
              No pricing tiers available at the moment. Please check back later.
            </Typography>
          )}
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box py={10} bgcolor="background.default">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            What Our Customers Say
          </Typography>

          <Grid container spacing={4} mt={6}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Paper elevation={3} sx={{ p: 3, height: "100%" }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar src={testimonial.avatar} sx={{ mr: 2 }} />
                    <Box>
                      <Typography fontWeight="bold">
                        {testimonial.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.role}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography>{testimonial.text}</Typography>
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
            Ready to Transform Your Lead Management?
          </Typography>
          <Typography variant="h5" paragraph>
            Join thousands of businesses growing with our platform
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ mt: 4, px: 6, py: 2 }}
            href="/signup"
          >
            Get Started Today
          </Button>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default LandingPage;
