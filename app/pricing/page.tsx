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
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Grow,
  Fade,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";

interface Tier {
  _id: string;
  discountPercentage: number;
  discountedPrice: string;
  tierType: string;
  tierUserType: string;
  renewalPrice: string;
  annualPrice: string;
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
}

const pricingFAQs = [
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, you'll receive credit toward future billing.",
  },
  {
    question: "Is there a free trial available?",
    answer:
      "Our Starter plan is completely free with no time limit. You can also start with a 14-day free trial on any paid plan to explore all features before committing.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, MasterCard, American Express, Discover), as well as bank transfers for annual Enterprise plans.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Absolutely. You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes! All our paid plans come with a discount when you choose annual billing. The exact savings are displayed on each plan card.",
  },
  {
    question: "What happens to my data if I downgrade?",
    answer:
      "Your data is always safe. If you downgrade and exceed the new plan's limits, existing data remains accessible but you won't be able to add more until you're within limits.",
  },
  {
    question: "Do you offer custom enterprise solutions?",
    answer:
      "Yes, we offer fully customizable enterprise solutions with dedicated support, custom integrations, SLAs, and volume pricing. Contact our sales team for details.",
  },
];

const PricingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [userType, setUserType] = useState<"seller" | "business">("seller");

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
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setLoading(false);
        setChecked(true);
      }
    };

    fetchTiers();
  }, []);

  const handleUserTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: "seller" | "business" | null,
  ) => {
    if (newType !== null) {
      setUserType(newType);
    }
  };

  const filteredTiers = tiers.filter((tier) => tier.tierUserType === userType);

  const renderSkeletons = () => (
    <Grid container spacing={4} mt={4} justifyContent="center">
      {[1, 2, 3, 4].map((index) => (
        <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="40%" height={60} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="100%" />
              <Box sx={{ mt: 2 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="text" width="100%" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <>
      <Header />
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          pt: { xs: 4, md: 8 },
          pb: 10,
        }}
      >
        <Container maxWidth="xl">
          {/* Hero Section */}
          <Fade in={checked} timeout={500}>
            <Box textAlign="center" mb={6}>
              <Typography
                variant="h2"
                fontWeight="bold"
                gutterBottom
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Simple, Transparent Pricing
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                maxWidth={700}
                mx="auto"
                mb={4}
              >
                Choose the plan that fits your business needs. All plans include
                our core features with options to scale as you grow.
              </Typography>

              {/* User Type Toggle */}
              <Paper
                elevation={0}
                sx={{
                  display: "inline-flex",
                  p: 0.5,
                  borderRadius: 3,
                  bgcolor: "action.hover",
                }}
              >
                <ToggleButtonGroup
                  value={userType}
                  exclusive
                  onChange={handleUserTypeChange}
                  aria-label="user type"
                  sx={{
                    "& .MuiToggleButton-root": {
                      px: 4,
                      py: 1.5,
                      border: "none",
                      borderRadius: "12px !important",
                      textTransform: "none",
                      fontWeight: 600,
                      "&.Mui-selected": {
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": {
                          bgcolor: "primary.dark",
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="seller">
                    <StorefrontIcon sx={{ mr: 1 }} />
                    Lead Sellers
                  </ToggleButton>
                  <ToggleButton value="business">
                    <BusinessIcon sx={{ mr: 1 }} />
                    Businesses
                  </ToggleButton>
                </ToggleButtonGroup>
              </Paper>

              <Typography variant="body2" color="text.secondary" mt={2}>
                {userType === "seller"
                  ? "Plans for lead generators and sellers"
                  : "Plans for businesses buying leads"}
              </Typography>
            </Box>
          </Fade>

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading && renderSkeletons()}

          {/* Pricing Cards */}
          {!loading && filteredTiers.length > 0 && (
            <Grid
              container
              spacing={3}
              alignItems="stretch"
              justifyContent="center"
            >
              {filteredTiers.map((tier, index) => (
                <Grid
                  size={{ xs: 12, sm: 6, lg: 3 }}
                  key={tier._id}
                  sx={{ display: "flex" }}
                >
                  <Grow
                    in={checked}
                    style={{ transformOrigin: "0 0 0" }}
                    {...(checked ? { timeout: 300 + index * 150 } : {})}
                  >
                    <Card
                      sx={{
                        width: "100%",
                        border: tier.highlight
                          ? `2px solid ${theme.palette.primary.main}`
                          : `1px solid ${theme.palette.divider}`,
                        transform:
                          tier.highlight && !isMobile
                            ? "scale(1.03)"
                            : undefined,
                        transition: "all 0.3s ease-in-out",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        borderRadius: 3,
                        overflow: "visible",
                        "&:hover": {
                          boxShadow: theme.shadows[12],
                          transform:
                            tier.highlight && !isMobile
                              ? "scale(1.05)"
                              : "scale(1.02)",
                        },
                      }}
                    >
                      {/* Popular Badge */}
                      {tier.highlight && (
                        <Chip
                          label="MOST POPULAR"
                          color="primary"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: -12,
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontWeight: "bold",
                            px: 2,
                          }}
                        />
                      )}

                      {/* Discount Badge */}
                      {tier.discountPercentage > 0 && (
                        <Chip
                          label={`SAVE ${tier.discountPercentage}%`}
                          color="success"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            fontWeight: "bold",
                          }}
                        />
                      )}

                      <CardContent
                        sx={{ flexGrow: 1, pt: tier.highlight ? 4 : 3 }}
                      >
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          {tier.name}
                        </Typography>

                        {/* Pricing */}
                        <Box sx={{ mb: 2 }}>
                          <Box display="flex" alignItems="baseline">
                            <Typography
                              variant="h3"
                              fontWeight="bold"
                              color="primary.main"
                            >
                              $
                              {tier.discountPercentage > 0
                                ? tier.discountedPrice
                                : tier.price}
                            </Typography>
                            <Typography
                              variant="body1"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              /month
                            </Typography>
                          </Box>

                          {tier.discountPercentage > 0 && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textDecoration: "line-through" }}
                            >
                              ${tier.price}/month
                            </Typography>
                          )}

                          {tier.tierType === "paid" && tier.annualPrice && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1 }}
                            >
                              Billed{" "}
                              <Box component="span" fontWeight="bold">
                                ${tier.annualPrice}
                              </Box>{" "}
                              annually
                              {tier.renewalPrice && (
                                <Box component="span">
                                  {" "}
                                  • Renews at ${tier.renewalPrice}/yr
                                </Box>
                              )}
                            </Typography>
                          )}
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2, minHeight: 40 }}
                        >
                          {tier.description}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        {/* Features */}
                        <List dense disablePadding>
                          {tier.features.slice(0, 8).map((feature, idx) => (
                            <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                <CheckCircleIcon
                                  color="primary"
                                  fontSize="small"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={feature}
                                primaryTypographyProps={{
                                  variant: "body2",
                                }}
                              />
                            </ListItem>
                          ))}
                          {tier.features.length > 8 && (
                            <ListItem disableGutters sx={{ py: 0.5 }}>
                              <ListItemText
                                primary={`+${tier.features.length - 8} more features`}
                                primaryTypographyProps={{
                                  variant: "body2",
                                  color: "primary",
                                  fontWeight: 600,
                                }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </CardContent>

                      <CardActions sx={{ p: 2, pt: 0 }}>
                        <Button
                          fullWidth
                          variant={tier.highlight ? "contained" : "outlined"}
                          color={tier.highlight ? "primary" : "inherit"}
                          size="large"
                          href="/auth/sign-in"
                          sx={{
                            py: 1.5,
                            fontWeight: 600,
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
          )}

          {/* Empty State */}
          {!loading && filteredTiers.length === 0 && (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">
                No pricing plans available for this category.
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Please check back later or contact us for custom solutions.
              </Typography>
            </Box>
          )}

          {/* Compare Plans Section */}
          <Fade in={checked} timeout={800}>
            <Box mt={10}>
              <Typography
                variant="h4"
                fontWeight="bold"
                textAlign="center"
                mb={2}
              >
                Everything You Need to Succeed
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
                mb={4}
              >
                All plans include these powerful features
              </Typography>

              <Grid container spacing={3} justifyContent="center">
                {[
                  {
                    title: "Lead Capture Forms",
                    desc: "Customizable forms to capture leads",
                  },
                  {
                    title: "Lead Management",
                    desc: "Organize and track all your leads",
                  },
                  {
                    title: "Dashboard Analytics",
                    desc: "Real-time insights and reports",
                  },
                  {
                    title: "Email Notifications",
                    desc: "Stay updated on new leads",
                  },
                  {
                    title: "Secure Data Storage",
                    desc: "Enterprise-grade security",
                  },
                  { title: "Mobile Responsive", desc: "Works on all devices" },
                ].map((feature, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: "center",
                        bgcolor: "action.hover",
                        borderRadius: 2,
                        height: "100%",
                      }}
                    >
                      <CheckCircleIcon
                        color="primary"
                        sx={{ fontSize: 32, mb: 1 }}
                      />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.desc}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Fade>

          {/* FAQ Section */}
          <Fade in={checked} timeout={1000}>
            <Box mt={10}>
              <Typography
                variant="h4"
                fontWeight="bold"
                textAlign="center"
                mb={2}
              >
                Frequently Asked Questions
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
                mb={4}
              >
                Have questions? We&apos;ve got answers.
              </Typography>

              <Box maxWidth={800} mx="auto">
                {pricingFAQs.map((faq, index) => (
                  <Accordion
                    key={index}
                    elevation={0}
                    sx={{
                      bgcolor: "transparent",
                      "&:before": { display: "none" },
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight={600}>{faq.question}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography color="text.secondary">
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Box>
          </Fade>

          {/* CTA Section */}
          <Fade in={checked} timeout={1200}>
            <Paper
              sx={{
                mt: 10,
                p: { xs: 4, md: 6 },
                textAlign: "center",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                borderRadius: 4,
                color: "white",
              }}
            >
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Ready to Get Started?
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mb: 4 }}>
                Join thousands of businesses using BRIXCOT to generate and
                manage leads.
              </Typography>
              <Box
                display="flex"
                gap={2}
                justifyContent="center"
                flexWrap="wrap"
              >
                <Button
                  variant="contained"
                  size="large"
                  href="/auth/sign-up"
                  sx={{
                    bgcolor: "white",
                    color: "primary.main",
                    px: 4,
                    "&:hover": {
                      bgcolor: "grey.100",
                    },
                  }}
                >
                  Start Free Trial
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="/contact"
                  sx={{
                    borderColor: "white",
                    color: "white",
                    px: 4,
                    "&:hover": {
                      borderColor: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Contact Sales
                </Button>
              </Box>
            </Paper>
          </Fade>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default PricingPage;
