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
  Grow,
  Fade,
  Slide,
  Zoom,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  LinearProgress,
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
import {
  Description,
  Speed,
  Psychology,
  Email,
  Sms,
  TrendingUp,
  Security,
  IntegrationInstructions,
  Store,
  AutoAwesome,
  Analytics,
  PhoneInTalk,
  Storefront,
  Groups,
  Rocket,
  Shield,
  SupportAgent,
  CloudSync,
  ExpandMore,
  PlayArrow,
  EmojiEvents,
  Verified,
  WorkspacePremium,
  ThumbUp,
  Business,
  Home,
  LocalHospital,
  School,
  DirectionsCar,
  AttachMoney,
  Lightbulb,
  FlashOn,
  Timer,
  TrendingDown,
} from "@mui/icons-material";
import Head from "next/head";

const LandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(true);
  }, []);

  const features = [
    {
      icon: <Psychology color="primary" />,
      text: "AI-Powered Lead Scoring",
      description:
        "Google Gemini AI automatically evaluates every lead, detecting spam and assigning quality scores (High/Medium/Low) for smarter prioritization.",
    },
    {
      icon: <PhoneInTalk color="primary" />,
      text: "Advanced Call Tracking",
      description:
        "Full Twilio integration with round-robin routing, geo-routing, call recording, transcription, AI analysis, and real-time call monitoring.",
    },
    {
      icon: <Email color="primary" />,
      text: "Email Marketing Automation",
      description:
        "Create beautiful email campaigns with templates, A/B testing, scheduling, and comprehensive open/click/unsubscribe tracking.",
    },
    {
      icon: <Sms color="primary" />,
      text: "SMS Marketing Campaigns",
      description:
        "Engage leads with SMS campaigns featuring template support, delivery tracking, and automatic opt-out compliance (STOP/START/HELP).",
    },
    {
      icon: <Storefront color="primary" />,
      text: "Lead Marketplace",
      description:
        "Sell leads through our integrated marketplace. Buyers browse available leads, preview details, and purchase with wallet-based transactions.",
    },
    {
      icon: <IntegrationInstructions color="primary" />,
      text: "Zapier & API Integration",
      description:
        "Connect with 6,000+ apps via Zapier. 12 trigger events and 7 actions for complete automation. Plus native API for custom integrations.",
    },
    {
      icon: <BuildIcon color="primary" />,
      text: "Drag & Drop Form Builder",
      description:
        "Create custom lead capture forms with our intuitive builder. Embed anywhere, track submissions, and auto-score incoming leads.",
    },
    {
      icon: <AutoAwesome color="primary" />,
      text: "Smart Lead Distribution",
      description:
        "Auto-assign leads based on buyer preferences, location, industry, and budget. Round-robin, priority, or manual distribution options.",
    },
    {
      icon: <Analytics color="primary" />,
      text: "Comprehensive Analytics",
      description:
        "Real-time dashboards with lead performance, call analytics, buyer metrics, campaign ROI tracking, and exportable reports.",
    },
    {
      icon: <Groups color="primary" />,
      text: "Buyer Management",
      description:
        "Manage lead buyers with approval workflows, wallet accounts, purchase history, auto-accept settings, and performance tracking.",
    },
    {
      icon: <Shield color="primary" />,
      text: "Enterprise Security",
      description:
        "AES-256 encryption, HMAC webhook signatures, Twilio validation, CSRF protection, and per-user credential isolation.",
    },
    {
      icon: <SupportAgent color="primary" />,
      text: "24/7 Priority Support",
      description:
        "Dedicated support team with in-app help center, video tutorials, comprehensive documentation, and direct chat assistance.",
    },
  ];

  const callTrackingFeatures = [
    "Round-Robin Buyer Assignment",
    "Business Hours Routing",
    "Vacation Mode Filtering",
    "Voicemail Recording",
    "Call Recording & Transcription",
    "AI Call Analysis & Scoring",
    "Geo-Routing by Area Code",
    "Multi-Ring Simultaneous Dialing",
    "Call Whisper & Screening",
    "Spam/Robot Detection",
    "Do-Not-Call (DNC) List",
    "Scheduled Callbacks",
  ];

  const platformStats = [
    { value: "6,000+", label: "App Integrations via Zapier" },
    { value: "99.9%", label: "Platform Uptime" },
    { value: "< 1s", label: "Lead Distribution Speed" },
    { value: "24/7", label: "Customer Support" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Real Estate Agency Owner",
      text: "The AI lead scoring alone increased our conversion by 40%. We no longer waste time on low-quality leads. The call tracking features are a game-changer!",
    },
    {
      name: "Michael Chen",
      role: "Insurance Broker",
      text: "Automated lead distribution saves us 20+ hours weekly. The geo-routing ensures leads go to agents in the right territory. Best investment we made.",
    },
    {
      name: "David Wilson",
      role: "Solar Sales Director",
      text: "From lead capture to sale, BRIXCOT handles everything. The marketplace feature opened new revenue streams we never knew existed.",
    },
    {
      name: "Jennifer Martinez",
      role: "Home Services Company",
      text: "The email and SMS campaigns are incredibly easy to set up. Our re-engagement rate improved by 65% since switching to BRIXCOT.",
    },
    {
      name: "Robert Taylor",
      role: "Digital Marketing Agency",
      text: "We manage leads for 50+ clients through BRIXCOT. The Zapier integration connects everything seamlessly. It's the backbone of our operation.",
    },
    {
      name: "Amanda Lee",
      role: "Mortgage Lead Buyer",
      text: "As a buyer, I love the marketplace. Preview leads before purchasing, see quality scores, and the wallet system makes transactions instant.",
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Capture Leads",
      description:
        "Use our form builder to create custom lead capture forms. Embed anywhere — your website, landing pages, or ads. Every submission is instantly processed.",
    },
    {
      step: 2,
      title: "AI Quality Scoring",
      description:
        "Our Gemini AI analyzes every lead in real-time, detecting spam and assigning quality scores. High-quality leads are prioritized automatically.",
    },
    {
      step: 3,
      title: "Smart Distribution",
      description:
        "Leads are auto-assigned to buyers based on your rules — by location, industry, budget, or round-robin. Or list them on the marketplace.",
    },
    {
      step: 4,
      title: "Engage & Convert",
      description:
        "Use call tracking, email campaigns, and SMS marketing to nurture leads. Track every interaction and optimize your conversion funnel.",
    },
  ];

  const sellerBenefits = [
    "Create unlimited lead capture forms",
    "AI-powered spam detection & lead scoring",
    "Automated buyer assignment & round-robin",
    "Built-in lead marketplace for monetization",
    "Email & SMS marketing campaigns",
    "Advanced call tracking with Twilio",
    "Zapier integration with 12 trigger events",
    "Comprehensive analytics dashboard",
  ];

  const buyerBenefits = [
    "Browse & purchase leads from marketplace",
    "Preview lead details before buying",
    "AI quality scores for informed decisions",
    "Wallet-based instant transactions",
    "Auto-accept leads matching your criteria",
    "Call tracking with caller ID & routing",
    "Dedicated buyer dashboard",
    "Real-time lead notifications",
  ];

  // Industry use cases for SEO
  const industries = [
    {
      icon: <Home />,
      name: "Real Estate",
      description:
        "Manage buyer and seller leads with automated follow-ups and property matching.",
      keywords: "real estate lead management, realtor CRM, property leads",
    },
    {
      icon: <AttachMoney />,
      name: "Insurance",
      description:
        "Distribute insurance leads by type, location, and agent availability.",
      keywords: "insurance lead software, agent lead distribution",
    },
    {
      icon: <Lightbulb />,
      name: "Solar & Energy",
      description:
        "Qualify solar leads with AI scoring and geo-route to local installers.",
      keywords: "solar lead management, energy lead generation",
    },
    {
      icon: <Business />,
      name: "Home Services",
      description:
        "Route plumbing, HVAC, and roofing leads to available contractors instantly.",
      keywords: "home services leads, contractor lead management",
    },
    {
      icon: <LocalHospital />,
      name: "Healthcare",
      description:
        "HIPAA-conscious lead handling for medical and dental practices.",
      keywords: "healthcare lead generation, medical practice leads",
    },
    {
      icon: <DirectionsCar />,
      name: "Automotive",
      description:
        "Connect car buyers with dealers based on make, model, and location preferences.",
      keywords: "auto dealer leads, car sales lead management",
    },
  ];

  // FAQ for SEO (FAQ schema)
  const faqs = [
    {
      question: "What is BRIXCOT lead management software?",
      answer:
        "BRIXCOT is an enterprise-grade lead management platform that combines AI-powered lead scoring, advanced call tracking, email and SMS marketing automation, and a built-in lead marketplace. It helps businesses capture, distribute, and convert leads more efficiently with features like round-robin distribution, geo-routing, and real-time analytics.",
    },
    {
      question: "How does AI lead scoring work?",
      answer:
        "Our AI lead scoring uses Google Gemini to analyze every incoming lead in real-time. It evaluates factors like contact validity, data completeness, and spam indicators to assign a quality score (High/Medium/Low). High-quality leads can be auto-distributed to premium buyers, while lower-quality leads go to the marketplace.",
    },
    {
      question: "What call tracking features does BRIXCOT offer?",
      answer:
        "BRIXCOT offers 16+ enterprise call tracking features including round-robin buyer assignment, geo-routing by area code, call recording and transcription, AI call analysis with sentiment scoring, multi-ring simultaneous dialing, call whisper and screening, voicemail recording, scheduled callbacks, and Do-Not-Call list management.",
    },
    {
      question: "Can I integrate BRIXCOT with my existing tools?",
      answer:
        "Yes! BRIXCOT integrates with 6,000+ apps through Zapier with 12 trigger events and 7 actions. You can connect to CRMs like HubSpot and Salesforce, ad platforms like Google Ads and Facebook Ads, and any other Zapier-supported tool. We also offer a REST API for custom integrations.",
    },
    {
      question: "How does the lead marketplace work?",
      answer:
        "The lead marketplace allows sellers to list excess or unmatched leads for purchase by verified buyers. Buyers can browse available leads, preview details (with contact info hidden until purchase), see AI quality scores, and buy instantly using their wallet balance. Sellers set pricing and buyers get high-intent leads.",
    },
    {
      question: "Is BRIXCOT suitable for my industry?",
      answer:
        "BRIXCOT is used across industries including real estate, insurance, solar/energy, home services, healthcare, automotive, mortgage, legal, and education. Our flexible form builder, customizable distribution rules, and industry-agnostic AI scoring make it adaptable to any lead-based business.",
    },
    {
      question: "What security features does BRIXCOT have?",
      answer:
        "BRIXCOT uses enterprise-grade security including AES-256 encryption for stored credentials, HMAC-SHA256 webhook signatures, Twilio signature validation, CSRF protection, per-user credential isolation, and rate limiting. Your data is protected at every level.",
    },
    {
      question: "Do you offer a free trial?",
      answer:
        "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start. You can test lead capture forms, distribution rules, call tracking, marketing campaigns, and the marketplace before committing to a paid plan.",
    },
  ];

  // Social proof numbers
  const socialProof = [
    { number: "10,000+", label: "Leads Processed Daily", growth: "+127%" },
    { number: "2,500+", label: "Active Businesses", growth: "+89%" },
    { number: "98.7%", label: "Customer Satisfaction", growth: "+12%" },
    { number: "$2.4M", label: "Leads Sold Monthly", growth: "+156%" },
  ];

  // Trust badges
  const trustBadges = [
    { icon: <Shield />, label: "SOC 2 Compliant" },
    { icon: <Verified />, label: "GDPR Ready" },
    { icon: <WorkspacePremium />, label: "Enterprise Grade" },
    { icon: <ThumbUp />, label: "4.9/5 Rating" },
  ];

  // Animated counter hook
  const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      if (!checked) return;
      let start = 0;
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }, [end, duration, checked]);
    return count;
  };

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      </Head>
      <Header />

      {/* Hero Section with Enhanced Gradient */}
      <Box
        component="section"
        aria-label="Hero"
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.dark} 100%)`,
          color: "white",
          py: { xs: 8, md: 14 },
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "url('/grid-pattern.svg') repeat",
            opacity: 0.1,
          },
        }}
      >
        {/* Floating shapes for visual interest */}
        <Box
          sx={{
            position: "absolute",
            top: "10%",
            right: "10%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            filter: "blur(60px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "20%",
            left: "5%",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            filter: "blur(40px)",
          }}
        />

        <Slide direction="down" in={checked} mountOnEnter unmountOnExit>
          <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
            <Grid container spacing={6} alignItems="center">
              <Grid size={{ xs: 12, md: 7 }}>
                {/* Trust badges row */}
                <Fade in={checked} timeout={800}>
                  <Stack
                    direction="row"
                    spacing={2}
                    mb={3}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {trustBadges.map((badge, i) => (
                      <Chip
                        key={i}
                        icon={React.cloneElement(badge.icon, {
                          sx: { color: "white !important", fontSize: 18 },
                        })}
                        label={badge.label}
                        size="small"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.15)",
                          color: "white",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          "& .MuiChip-icon": { color: "white" },
                        }}
                      />
                    ))}
                  </Stack>
                </Fade>

                <Typography
                  variant="h1"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "2.5rem", md: "3.5rem", lg: "4rem" },
                    lineHeight: 1.1,
                    textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  The #1 AI-Powered{" "}
                  <Box
                    component="span"
                    sx={{
                      background: "linear-gradient(90deg, #FFD700, #FFA500)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Lead Management
                  </Box>{" "}
                  Platform
                </Typography>

                <Typography
                  variant="h5"
                  component="h2"
                  gutterBottom
                  sx={{
                    opacity: 0.95,
                    fontWeight: 400,
                    lineHeight: 1.6,
                    mb: 3,
                  }}
                >
                  Capture, score, distribute, and convert leads with
                  enterprise-grade automation. AI lead scoring, advanced call
                  tracking, email & SMS marketing, and a built-in lead
                  marketplace — all in one powerful platform.
                </Typography>

                {/* Feature pills */}
                <Box sx={{ mb: 4 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {[
                      {
                        label: "AI Lead Scoring",
                        icon: <Psychology sx={{ fontSize: 16 }} />,
                      },
                      {
                        label: "Call Tracking",
                        icon: <PhoneInTalk sx={{ fontSize: 16 }} />,
                      },
                      {
                        label: "Email & SMS",
                        icon: <Email sx={{ fontSize: 16 }} />,
                      },
                      {
                        label: "Marketplace",
                        icon: <Storefront sx={{ fontSize: 16 }} />,
                      },
                      {
                        label: "6000+ Integrations",
                        icon: <IntegrationInstructions sx={{ fontSize: 16 }} />,
                      },
                    ].map((tag) => (
                      <Chip
                        key={tag.label}
                        icon={tag.icon}
                        label={tag.label}
                        size="small"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.1)",
                          color: "white",
                          border: "1px solid rgba(255,255,255,0.3)",
                          mb: 1,
                          "& .MuiChip-icon": { color: "rgba(255,255,255,0.8)" },
                          transition: "all 0.3s",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.2)",
                            transform: "translateY(-2px)",
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* CTA Buttons */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    href="/auth/sign-in?trial=true"
                    startIcon={<Rocket />}
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        sessionStorage.setItem("trialIntent", "true");
                      }
                    }}
                    sx={{
                      px: 4,
                      py: 1.8,
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      borderRadius: 2,
                      boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
                      },
                    }}
                  >
                    Start Free 14-Day Trial
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="large"
                    href="#demo"
                    startIcon={<PlayArrow />}
                    sx={{
                      px: 4,
                      py: 1.8,
                      borderWidth: 2,
                      borderRadius: 2,
                      "&:hover": {
                        borderWidth: 2,
                        bgcolor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    Watch Demo
                  </Button>
                </Stack>

                <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
                  <CheckCircleIcon
                    sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }}
                  />
                  No credit card required
                  <Box component="span" sx={{ mx: 2 }}>
                    •
                  </Box>
                  <CheckCircleIcon
                    sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }}
                  />
                  Full feature access
                  <Box component="span" sx={{ mx: 2 }}>
                    •
                  </Box>
                  <CheckCircleIcon
                    sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }}
                  />
                  Cancel anytime
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Zoom
                  in={checked}
                  style={{ transitionDelay: checked ? "300ms" : "0ms" }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {/* Animated ring */}
                    <Box
                      sx={{
                        position: "absolute",
                        width: "110%",
                        height: "110%",
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.2)",
                        animation: "pulse 2s infinite",
                        "@keyframes pulse": {
                          "0%": { transform: "scale(1)", opacity: 1 },
                          "50%": { transform: "scale(1.05)", opacity: 0.5 },
                          "100%": { transform: "scale(1)", opacity: 1 },
                        },
                      }}
                    />
                    <Paper
                      elevation={20}
                      sx={{
                        bgcolor: "white",
                        p: 2,
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    >
                      <Image
                        src={logo}
                        alt="BRIXCOT - Best Lead Management Software Platform"
                        style={{
                          width: "100%",
                          maxWidth: 280,
                          height: "auto",
                          display: "block",
                        }}
                        priority
                      />
                    </Paper>
                  </Box>
                </Zoom>
              </Grid>
            </Grid>

            {/* Social proof stats */}
            {/* <Fade in={checked} timeout={1200}>
              <Paper
                elevation={0}
                sx={{
                  mt: 8,
                  p: 3,
                  bgcolor: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  borderRadius: 3,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <Grid container spacing={3}>
                  {socialProof.map((stat, index) => (
                    <Grid size={{ xs: 6, md: 3 }} key={index}>
                      <Box textAlign="center">
                        <Typography
                          variant="h3"
                          fontWeight="bold"
                          sx={{
                            background: "linear-gradient(90deg, #fff, #FFD700)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          {stat.number}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {stat.label}
                        </Typography>
                        <Chip
                          label={stat.growth}
                          size="small"
                          icon={
                            <TrendingUp
                              sx={{ fontSize: 14, color: "#4CAF50 !important" }}
                            />
                          }
                          sx={{
                            mt: 1,
                            bgcolor: "rgba(76,175,80,0.2)",
                            color: "#81C784",
                            fontSize: "0.7rem",
                            height: 24,
                          }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Fade> */}
          </Container>
        </Slide>
      </Box>

      {/* Industries Section for SEO */}
      <Box
        component="section"
        aria-label="Industries We Serve"
        py={8}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="xl">
          <Fade in={checked}>
            <Box textAlign="center" mb={5}>
              {/* <Chip label="Industry Solutions" color="primary" sx={{ mb: 2 }} /> */}
              <Typography
                variant="h3"
                component="h2"
                fontWeight="bold"
                gutterBottom
              >
                Lead Management for Every Industry
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                maxWidth="700px"
                mx="auto"
              >
                From real estate to healthcare, BRIXCOT powers lead operations
                across industries with customizable workflows.
              </Typography>
            </Box>
          </Fade>

          <Grid container spacing={3}>
            {industries.map((industry, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Grow
                  in={checked}
                  style={{ transformOrigin: "0 0 0" }}
                  {...(checked ? { timeout: 400 + index * 100 } : {})}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      transition: "all 0.3s",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: 4,
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.light",
                          color: "primary.main",
                          mr: 2,
                        }}
                      >
                        {industry.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        {industry.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {industry.description}
                    </Typography>
                  </Paper>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box py={10} bgcolor="background.default" id="how-it-works">
        <Container maxWidth="xl">
          <Fade in={checked}>
            <Box textAlign="center" mb={6}>
              <Typography
                variant="h3"
                fontWeight="bold"
                gutterBottom
                color="primary.main"
              >
                How BRIXCOT Works
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                maxWidth="700px"
                mx="auto"
              >
                From lead capture to conversion in four simple steps. Our
                platform handles everything automatically.
              </Typography>
            </Box>
          </Fade>

          <Grid container spacing={4}>
            {howItWorks.map((item, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Grow
                  in={checked}
                  style={{ transformOrigin: "0 0 0" }}
                  {...(checked ? { timeout: 500 + index * 200 } : {})}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: "100%",
                      textAlign: "center",
                      bgcolor: "transparent",
                      position: "relative",
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        width: 60,
                        height: 60,
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        mx: "auto",
                        mb: 2,
                      }}
                    >
                      {item.step}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                    {index < howItWorks.length - 1 && !isMobile && (
                      <Box
                        sx={{
                          position: "absolute",
                          right: -20,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "primary.main",
                          fontSize: "2rem",
                        }}
                      >
                        →
                      </Box>
                    )}
                  </Paper>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section with Staggered Grow animations */}
      <Box py={10} bgcolor="background.paper" id="features">
        <Container maxWidth="xl">
          <Fade in={checked}>
            <Box textAlign="center" mb={6}>
              <Typography
                variant="h3"
                fontWeight="bold"
                gutterBottom
                color="primary.main"
              >
                Everything You Need to Dominate Lead Management
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                maxWidth="800px"
                mx="auto"
              >
                BRIXCOT combines AI-powered automation, advanced call tracking,
                marketing tools, and a built-in marketplace into one powerful
                platform.
              </Typography>
            </Box>
          </Fade>

          <Grid container spacing={3} mt={2}>
            {features.map((feature, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Grow
                  in={checked}
                  style={{ transformOrigin: "0 0 0" }}
                  {...(checked ? { timeout: 300 + index * 100 } : {})}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      height: "100%",
                      transition: "all 0.3s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: theme.shadows[8],
                      },
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar
                        sx={{ bgcolor: theme.palette.primary.light, mr: 2 }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        {feature.text}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Paper>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call Tracking Showcase Section */}
      <Box py={10} bgcolor="background.default">
        <Container maxWidth="xl">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Slide direction="right" in={checked} mountOnEnter unmountOnExit>
                <Box>
                  {/* <Chip
                    label="Enterprise-Grade Call Tracking"
                    color="primary"
                    sx={{ mb: 2 }}
                  /> */}
                  <Typography variant="h3" fontWeight="bold" gutterBottom>
                    The Most Advanced Call Tracking in the Industry
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Powered by Twilio, our call tracking system offers 16+
                    enterprise features that help you route calls intelligently,
                    record conversations, and analyze performance with AI.
                  </Typography>
                  <Grid container spacing={1}>
                    {callTrackingFeatures.map((feature, index) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={index}>
                        <Box display="flex" alignItems="center" py={0.5}>
                          <CheckCircleIcon
                            color="primary"
                            sx={{ mr: 1, fontSize: 20 }}
                          />
                          <Typography variant="body2">{feature}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    href="/how-it-works"
                    sx={{ mt: 3 }}
                  >
                    Learn More About Call Tracking
                  </Button>
                </Box>
              </Slide>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Zoom in={checked} style={{ transitionDelay: "300ms" }}>
                <Paper
                  elevation={4}
                  sx={{
                    p: 4,
                    bgcolor: theme.palette.primary.dark,
                    color: "white",
                    borderRadius: 3,
                  }}
                >
                  <PhoneInTalk sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    AI-Powered Call Analysis
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }} paragraph>
                    Every call is transcribed and analyzed by Google Gemini AI.
                    Get sentiment analysis, lead quality scores, and automatic
                    call summaries.
                  </Typography>
                  <Divider
                    sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }}
                  />
                  <Box display="flex" justifyContent="space-between">
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight="bold">
                        A-D
                      </Typography>
                      <Typography variant="caption">Lead Grades</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight="bold">
                        100%
                      </Typography>
                      <Typography variant="caption">Call Recording</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight="bold">
                        Real-Time
                      </Typography>
                      <Typography variant="caption">Transcription</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* For Sellers & Buyers Section */}
      <Box py={10} bgcolor="background.paper">
        <Container maxWidth="xl">
          <Fade in={checked}>
            <Box textAlign="center" mb={6}>
              <Typography
                variant="h3"
                fontWeight="bold"
                gutterBottom
                color="primary.main"
              >
                Built for Both Sellers & Buyers
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Whether you generate leads or buy them, BRIXCOT has you covered.
              </Typography>
            </Box>
          </Fade>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Slide direction="up" in={checked} mountOnEnter unmountOnExit>
                <Paper
                  elevation={3}
                  sx={{
                    p: 4,
                    height: "100%",
                    borderTop: `4px solid ${theme.palette.primary.main}`,
                  }}
                >
                  <Box display="flex" alignItems="center" mb={3}>
                    <Avatar
                      sx={{
                        bgcolor: "primary.main",
                        width: 56,
                        height: 56,
                        mr: 2,
                      }}
                    >
                      <TrendingUp />
                    </Avatar>
                    <Typography variant="h4" fontWeight="bold">
                      For Lead Sellers
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Generate, manage, and monetize your leads with powerful
                    tools designed for lead generation companies of all sizes.
                  </Typography>
                  <List dense>
                    {sellerBenefits.map((benefit, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={benefit} />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    href="/auth/sign-in"
                    sx={{ mt: 2 }}
                  >
                    Start Selling Leads
                  </Button>
                </Paper>
              </Slide>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Slide
                direction="up"
                in={checked}
                mountOnEnter
                unmountOnExit
                timeout={700}
              >
                <Paper
                  elevation={3}
                  sx={{
                    p: 4,
                    height: "100%",
                    borderTop: `4px solid ${theme.palette.secondary.main}`,
                  }}
                >
                  <Box display="flex" alignItems="center" mb={3}>
                    <Avatar
                      sx={{
                        bgcolor: "secondary.main",
                        width: 56,
                        height: 56,
                        mr: 2,
                      }}
                    >
                      <Store />
                    </Avatar>
                    <Typography variant="h4" fontWeight="bold">
                      For Lead Buyers
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Access high-quality leads from verified sellers with
                    AI-powered quality scoring and instant purchasing.
                  </Typography>
                  <List dense>
                    {buyerBenefits.map((benefit, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="secondary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={benefit} />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    size="large"
                    href="/RegisterBuyer"
                    sx={{ mt: 2 }}
                  >
                    Start Buying Leads
                  </Button>
                </Paper>
              </Slide>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Integrations Section */}
      {/* <Box py={10} bgcolor="background.default">
        <Container maxWidth="xl">
          <Fade in={checked}>
            <Box textAlign="center" mb={6}>
              <Typography
                variant="h3"
                fontWeight="bold"
                gutterBottom
                color="primary.main"
              >
                Connect with Your Favorite Tools
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                maxWidth="700px"
                mx="auto"
              >
                BRIXCOT integrates seamlessly with 6,000+ apps through Zapier.
                Automate your workflows and keep everything in sync.
              </Typography>
            </Box>
          </Fade>

          <Grid container spacing={3} justifyContent="center">
            {[
              {
                name: "Zapier",
                desc: "12 triggers, 7 actions",
                icon: <CloudSync />,
              },
              { name: "Google Ads", desc: "Lead import", icon: <TrendingUp /> },
              { name: "Facebook Ads", desc: "Lead sync", icon: <Groups /> },
              {
                name: "HubSpot",
                desc: "Via Zapier",
                icon: <IntegrationInstructions />,
              },
              { name: "Salesforce", desc: "Via Zapier", icon: <Store /> },
              {
                name: "Custom API",
                desc: "REST & Webhooks",
                icon: <Description />,
              },
            ].map((integration, index) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={index}>
                <Grow
                  in={checked}
                  style={{ transformOrigin: "0 0 0" }}
                  {...(checked ? { timeout: 500 + index * 100 } : {})}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      textAlign: "center",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "scale(1.05)",
                        boxShadow: theme.shadows[6],
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: "primary.light",
                        mx: "auto",
                        mb: 2,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {integration.icon}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {integration.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {integration.desc}
                    </Typography>
                  </Paper>
                </Grow>
              </Grid>
            ))}
          </Grid>

          <Box textAlign="center" mt={4}>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              href="/dashboard/seller/integrations"
            >
              View All Integrations
            </Button>
          </Box>
        </Container>
      </Box> */}

      {/* Pricing CTA Section */}
      <Fade in={checked}>
        <Box
          py={10}
          id="pricing"
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          }}
        >
          <Container maxWidth="lg">
            <Box textAlign="center" color="white">
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Simple, Transparent Pricing
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
                Choose from flexible plans designed for lead sellers and
                businesses. Start free and scale as you grow.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="center"
              >
                <Button
                  variant="contained"
                  size="large"
                  href="/pricing"
                  sx={{
                    bgcolor: "white",
                    color: "primary.main",
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    "&:hover": {
                      bgcolor: "grey.100",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  View All Plans
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="/auth/sign-up"
                  sx={{
                    borderColor: "white",
                    color: "white",
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Start Free Trial
                </Button>
              </Stack>
              <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
                No credit card required for free plan
              </Typography>
            </Box>
          </Container>
        </Box>
      </Fade>

      {/* Testimonials Section with Slide animations */}
      <Box py={10} bgcolor="background.paper">
        <Container maxWidth="xl">
          <Slide direction="up" in={checked} mountOnEnter unmountOnExit>
            <Box textAlign="center" mb={6}>
              <Typography
                variant="h3"
                fontWeight="bold"
                gutterBottom
                color="primary.main"
              >
                Trusted by Industry Leaders
              </Typography>
              <Typography variant="h6" color="text.secondary">
                See why thousands of businesses choose BRIXCOT for lead
                management.
              </Typography>
            </Box>
          </Slide>

          <Grid container spacing={3}>
            {testimonials.map((testimonial, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Slide
                  direction="up"
                  in={checked}
                  mountOnEnter
                  unmountOnExit
                  timeout={500 + index * 150}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      height: "100%",
                      transition: "all 0.3s ease",
                      display: "flex",
                      flexDirection: "column",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: theme.shadows[6],
                      },
                    }}
                  >
                    <Box mb={2}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} style={{ color: "#FFD700" }}>
                          ★
                        </span>
                      ))}
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{ flexGrow: 1, fontStyle: "italic", mb: 2 }}
                    >
                      &quot;{testimonial.text}&quot;
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                        {testimonial.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="bold">
                          {testimonial.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {testimonial.role}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Slide>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section with Zoom animation */}
      <Zoom in={checked} style={{ transitionDelay: checked ? "500ms" : "0ms" }}>
        <Box py={12} bgcolor="primary.main" color="white">
          <Container maxWidth="lg" sx={{ textAlign: "center" }}>
            <Rocket sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Ready to Transform Your Lead Business?
            </Typography>
            <Typography variant="h5" paragraph sx={{ opacity: 0.9 }}>
              Join thousands of businesses already using BRIXCOT to capture,
              manage, and convert more leads than ever before.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              mt={4}
            >
              <Button
                variant="contained"
                color="secondary"
                size="large"
                sx={{
                  px: 6,
                  py: 2,
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: theme.shadows[8],
                  },
                }}
                href="/auth/sign-in?trial=true"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("trialIntent", "true");
                  }
                }}
              >
                Start Your Free 14-Day Trial
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                sx={{ px: 6, py: 2 }}
                href="/contact"
              >
                Talk to Sales
              </Button>
            </Stack>
            <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
              No credit card required • Full access to all features • Cancel
              anytime
            </Typography>
          </Container>
        </Box>
      </Zoom>

      {/* FAQ Section for SEO */}
      <Box
        component="section"
        aria-label="Frequently Asked Questions"
        id="faq"
        py={10}
        bgcolor="background.paper"
      >
        <Container maxWidth="lg">
          <Fade in={checked}>
            <Box textAlign="center" mb={6}>
              <Chip
                label="Got Questions?"
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography
                variant="h3"
                component="h2"
                fontWeight="bold"
                gutterBottom
              >
                Frequently Asked Questions
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Everything you need to know about BRIXCOT lead management
                platform
              </Typography>
            </Box>
          </Fade>

          <Box sx={{ mt: 4 }}>
            {faqs.map((faq, index) => (
              <Grow
                key={index}
                in={checked}
                style={{ transformOrigin: "0 0 0" }}
                {...(checked ? { timeout: 300 + index * 100 } : {})}
              >
                <Accordion
                  elevation={0}
                  sx={{
                    mb: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "12px !important",
                    "&:before": { display: "none" },
                    "&.Mui-expanded": {
                      borderColor: "primary.main",
                      boxShadow: 2,
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      py: 1,
                      "& .MuiAccordionSummary-content": { my: 2 },
                    }}
                  >
                    <Typography variant="h6" fontWeight="600">
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 3 }}>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ lineHeight: 1.8 }}
                    >
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Grow>
            ))}
          </Box>

          <Box textAlign="center" mt={6}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Still have questions?
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              href="/contact"
              sx={{ mt: 1 }}
            >
              Contact Our Team
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Final Trust Section */}
      {/* <Box
        py={6}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.grey[100]} 0%, ${theme.palette.grey[50]} 100%)`,
        }}
      >
        <Container maxWidth="xl">
          <Grid
            container
            spacing={4}
            alignItems="center"
            justifyContent="center"
          >
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={4}
                justifyContent="center"
                alignItems="center"
              >
                <Box textAlign="center">
                  <Rating value={4.9} precision={0.1} readOnly size="large" />
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    4.9/5 from 2,847 reviews
                  </Typography>
                </Box>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: "none", sm: "block" } }}
                />
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    2,500+
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Businesses
                  </Typography>
                </Box>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: "none", sm: "block" } }}
                />
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    10M+
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Leads Processed
                  </Typography>
                </Box>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: "none", sm: "block" } }}
                />
                <Box textAlign="center">
                  <EmojiEvents sx={{ fontSize: 40, color: "#FFD700" }} />
                  <Typography variant="body2" color="text.secondary">
                    G2 Leader 2026
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box> */}

      <Footer />
    </>
  );
};

export default LandingPage;
