"use client";
import React, { useEffect, useState, Key } from "react";
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
  Grow,
  Fade,
  Slide,
  Zoom,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhoneIcon from "@mui/icons-material/Phone";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import BuildIcon from "@mui/icons-material/Build";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";
import logo from "../../public/BRIXCOT.png";
import Image from "next/image";

interface Tier {
  _id: string;
  discountPercentage: number;
  discountedPrice: string;
  tierType: string;
  renewalPrice: string;
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
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const response = await fetch("/api/tiers");
        if (!response.ok) {
          throw new Error("Failed to fetch pricing tiers");
        }
        const data = await response.json();
        setTiers(data.filter((tier: Tier) => tier.isActive));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
        setChecked(true);
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
      // avatar: "/avatars/1.jpg",
    },
    {
      name: "Michael Chen",
      role: "Insurance Broker",
      text: "The automated lead distribution saves us hours every week.",
      // avatar: "/avatars/2.jpg",
    },
    {
      name: "David Wilson",
      role: "Solar Sales Director",
      text: "Best ROI of any marketing tool we use. Pays for itself in days.",
      // avatar: "/avatars/3.jpg",
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

  return (
    <>
      <Header />

      {/* Hero Section with Slide animation */}
      <Slide direction="down" in={checked} mountOnEnter unmountOnExit>
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
                <Zoom
                  in={checked}
                  style={{ transitionDelay: checked ? "300ms" : "0ms" }}
                >
                  <div
                    style={{
                      backgroundColor: "white", // Force white background
                      display: "inline-block",
                      padding: "8px", // Optional: Add spacing around image
                      borderRadius: "100%", // Optional: Rounded corners
                      boxShadow: "6px 6px 12px rgba(0,0,0,0.1)", // Optional: Add subtle shadow
                      marginLeft: "60px",
                    }}
                  >
                    <Image
                      src={logo}
                      alt="Lead Management Dashboard"
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </div>
                </Zoom>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Slide>

      {/* Features Section with Staggered Grow animations */}
      <Box py={10} bgcolor="background.paper" id="features">
        <Container maxWidth="lg">
          <Fade in={checked}>
            <Box>
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
            </Box>
          </Fade>

          <Grid container spacing={4} mt={6}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Grow
                  in={checked}
                  style={{ transformOrigin: "0 0 0" }}
                  {...(checked ? { timeout: 500 + index * 300 } : {})}
                >
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      height: "100%",
                      transition: "transform 0.3s ease-in-out",
                      "&:hover": { transform: "scale(1.03)" },
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar
                        sx={{ bgcolor: theme.palette.primary.light, mr: 2 }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h6">{feature.text}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Sed do eiusmod tempor incididunt ut labore.
                    </Typography>
                  </Paper>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section with Fade animation */}
      <Fade in={checked}>
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
                {tiers.map((tier, index) => (
                  <Grid item xs={12} md={4} key={tier._id}>
                    <Grow
                      in={checked}
                      style={{ transformOrigin: "0 0 0" }}
                      {...(checked ? { timeout: 500 + index * 200 } : {})}
                    >
                      <Card
                        sx={{
                          height: "100%",
                          border: tier.highlight
                            ? `2px solid ${theme.palette.primary.main}`
                            : undefined,
                          transform:
                            tier.highlight && !isMobile
                              ? "scale(1.05)"
                              : undefined,
                          transition: "all 0.3s ease-in-out",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                          "&:hover": {
                            boxShadow: theme.shadows[8],
                            transform:
                              tier.highlight && !isMobile
                                ? "scale(1.07)"
                                : "scale(1.02)",
                          },
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

                        {tier.discountPercentage > 0 && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 16,
                              right: 16,
                              bgcolor: "success.main",
                              color: "success.contrastText",
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              zIndex: 1,
                            }}
                          >
                            <Typography variant="caption" fontWeight="bold">
                              SAVE {tier.discountPercentage}%
                            </Typography>
                          </Box>
                        )}

                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h5" component="h2" gutterBottom>
                            {tier.name}
                          </Typography>

                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h3" component="div">
                              $
                              {tier.discountPercentage > 0
                                ? tier.discountedPrice
                                : tier.price}
                              <Typography
                                component="span"
                                variant="h6"
                                color="text.secondary"
                                sx={{ ml: 1 }}
                              >
                                /month
                              </Typography>
                            </Typography>

                            {tier.discountPercentage > 0 && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ textDecoration: "line-through" }}
                              >
                                ${tier.price}/month
                              </Typography>
                            )}
                          </Box>

                          {tier.tierType === "paid" && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.primary">
                                <Box component="span" fontWeight="bold">
                                  You pay $
                                  {(
                                    parseFloat(
                                      tier.discountedPrice || tier.price
                                    ) * 12
                                  ).toFixed(2)}
                                </Box>
                                {tier.renewalPrice && (
                                  <Box component="span">
                                    {" "}
                                    - renews at ${tier.renewalPrice}/year
                                  </Box>
                                )}
                              </Typography>
                              {tier.discountPercentage > 0 && (
                                <Typography
                                  variant="caption"
                                  color="success.main"
                                >
                                  Save {tier.discountPercentage}% on first year
                                </Typography>
                              )}
                            </Box>
                          )}

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
                            href={`/auth/sign-in?`}
                            sx={{
                              transition: "all 0.3s ease",
                              "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: 3,
                              },
                            }}
                          >
                            {tier.ctaText}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grow>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography align="center" color="text.secondary" mt={4}>
                No pricing tiers available at the moment. Please check back
                later.
              </Typography>
            )}
          </Container>
        </Box>
      </Fade>

      {/* Testimonials Section with Slide animations */}
      <Box py={10} bgcolor="background.default">
        <Container maxWidth="lg">
          <Slide direction="up" in={checked} mountOnEnter unmountOnExit>
            <Box>
              <Typography variant="h3" align="center" gutterBottom>
                What Our Customers Say
              </Typography>
            </Box>
          </Slide>

          <Grid container spacing={4} mt={6}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Slide
                  direction="up"
                  in={checked}
                  mountOnEnter
                  unmountOnExit
                  timeout={500 + index * 300}
                >
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      height: "100%",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: theme.shadows[6],
                      },
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      {/* <Avatar src={testimonial.avatar} sx={{ mr: 2 }} /> */}
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
                </Slide>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section with Zoom animation */}
      <Zoom in={checked} style={{ transitionDelay: checked ? "500ms" : "0ms" }}>
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
              sx={{
                mt: 4,
                px: 6,
                py: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: theme.shadows[8],
                },
              }}
              href="/auth/sign-in"
            >
              Get Started Today
            </Button>
          </Container>
        </Box>
      </Zoom>

      <Footer />
    </>
  );
};

export default LandingPage;
