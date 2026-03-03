"use client";
import React, { useState } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Divider,
  TextField,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  SupportAgent as TicketIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";

const ContactPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    agreeTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSubmitSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        agreeTerms: false,
      });
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to send message.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: <EmailIcon color="primary" />,
      title: "Email Support",
      description: "Get detailed responses within 24 hours",
      action: "Send us an email",
      details: "support@leadmanager.com",
    },
    {
      icon: <PhoneIcon color="primary" />,
      title: "Phone Support",
      description: "Speak directly with our support team",
      action: "Call us now",
      details: "+1 (800) 123-4567",
    },
    // {
    //   icon: <ChatIcon color="primary" />,
    //   title: "Live Chat",
    //   description: "Instant help from our online agents",
    //   action: "Start chat",
    //   details: "Available 9AM-5PM EST",
    // },
    // {
    //   icon: <TicketIcon color="primary" />,
    //   title: "Ticket System",
    //   description: "Track your support requests",
    //   action: "Create ticket",
    //   details: "24/7 ticket submission",
    // },
  ];

  const faqs = [
    {
      question: "How do I integrate with my CRM?",
      answer:
        "We provide API documentation and dedicated support for CRM integrations.",
    },
    {
      question: "What's your lead distribution methodology?",
      answer:
        "Leads can be distributed round-robin, by location, or using custom rules.",
    },
    {
      question: "Can I sell leads on your marketplace?",
      answer: "Yes, all paid plans include access to our lead marketplace.",
    },
    {
      question: "How do you ensure lead quality?",
      answer: "We use multiple verification methods and allow buyer ratings.",
    },
  ];

  return (
    <>
      <Header />

      {/* Hero Section */}
      <Box
        bgcolor={theme.palette.primary.main}
        color="white"
        py={10}
        textAlign="center"
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom>
            We're Here to Help
          </Typography>
          <Typography variant="h5" maxWidth="md" mx="auto">
            Contact our team for support, sales inquiries, or partnership
            opportunities
          </Typography>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6}>
          {/* Contact Methods */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="h4" gutterBottom>
              Contact Options
            </Typography>
            <Typography color="text.secondary" paragraph>
              Choose your preferred method to get in touch with our team
            </Typography>

            <Grid container spacing={3} mt={2}>
              {contactMethods.map((method, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={index}>
                  <Card
                    elevation={3}
                    sx={{
                      height: "100%",
                      cursor: "pointer",
                      border:
                        activeTab === index
                          ? `2px solid ${theme.palette.primary.main}`
                          : undefined,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 6,
                      },
                    }}
                    onClick={() => setActiveTab(index)}
                  >
                    <CardContent>
                      <Avatar
                        sx={{
                          bgcolor: theme.palette.primary.light,
                          mb: 2,
                          width: 56,
                          height: 56,
                        }}
                      >
                        {method.icon}
                      </Avatar>
                      <Typography variant="h6" gutterBottom>
                        {method.title}
                      </Typography>
                      <Typography color="text.secondary" paragraph>
                        {method.description}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={method.icon}
                        fullWidth
                      >
                        {method.action}
                      </Button>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={1}
                        textAlign="center"
                      >
                        {method.details}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Office Location */}
            {/* <Box mt={6}>
              <Typography variant="h5" gutterBottom>
                Our Office
              </Typography>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <LocationIcon color="primary" sx={{ mr: 2 }} />
                  <Typography>
                    123 Lead Street, Suite 500
                    <br />
                    San Francisco, CA 94107
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="center" mt={3}>
                  <Button
                    variant="contained"
                    color="secondary"
                    href="https://maps.google.com"
                    target="_blank"
                  >
                    Get Directions
                  </Button>
                </Box>
              </Paper>
            </Box> */}
          </Grid>

          {/* Contact Form */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card elevation={3}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Tab label="Email" icon={<EmailIcon />} iconPosition="start" />
                <Tab label="Phone" icon={<PhoneIcon />} iconPosition="start" />
                {/* <Tab
                  label="Live Chat"
                  icon={<ChatIcon />}
                  iconPosition="start"
                /> */}
                {/* <Tab
                  label="Support Ticket"
                  icon={<TicketIcon />}
                  iconPosition="start"
                /> */}
              </Tabs>

              <CardContent>
                {submitSuccess ? (
                  <Box textAlign="center" py={4}>
                    <CheckCircleIcon
                      color="success"
                      sx={{ fontSize: 60, mb: 2 }}
                    />
                    <Typography variant="h5" gutterBottom>
                      Message Sent Successfully!
                    </Typography>
                    <Typography color="text.secondary">
                      Our team will get back to you within 24 hours. For urgent
                      matters, please call our support line.
                    </Typography>
                    <Button
                      variant="outlined"
                      sx={{ mt: 3 }}
                      onClick={() => setSubmitSuccess(false)}
                    >
                      Send Another Message
                    </Button>
                  </Box>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      {submitError && (
                        <Grid size={{ xs: 12 }}>
                          <Alert
                            severity="error"
                            onClose={() => setSubmitError(null)}
                          >
                            {submitError}
                          </Alert>
                        </Grid>
                      )}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Your Name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      {activeTab === 1 && (
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                          />
                        </Grid>
                      )}
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Your Message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          multiline
                          rows={6}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="agreeTerms"
                              checked={formData.agreeTerms}
                              onChange={handleChange}
                              required
                              color="primary"
                            />
                          }
                          label="I agree to the terms and conditions"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          size="large"
                          fullWidth
                          endIcon={<SendIcon />}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <CircularProgress size={24} color="inherit" />
                              <Box ml={2}>Sending...</Box>
                            </>
                          ) : (
                            "Send Message"
                          )}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* FAQ Section */}
            {/* <Box mt={6}>
              <Typography variant="h4" gutterBottom color="primary.main">
                Frequently Asked Questions
              </Typography>
              <List>
                {faqs.map((faq, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <CheckCircleIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography fontWeight="medium">
                            {faq.question}
                          </Typography>
                        }
                        secondary={faq.answer}
                      />
                    </ListItem>
                    {index < faqs.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Box> */}
          </Grid>
        </Grid>
      </Container>

      {/* Team Section */}
      {/* <Box bgcolor="background.default" py={8}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            Meet Our Support Team
          </Typography>
          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            paragraph
          >
            Dedicated professionals ready to assist you
          </Typography>

          <Grid container spacing={4} mt={4}>
            {[
              {
                name: "Alex Johnson",
                role: "Support Manager",
                expertise: "CRM Integrations",
                avatar: "/team/1.jpg",
              },
              {
                name: "Maria Garcia",
                role: "Lead Specialist",
                expertise: "Lead Distribution",
                avatar: "/team/2.jpg",
              },
              {
                name: "David Kim",
                role: "Technical Support",
                expertise: "API & Webhooks",
                avatar: "/team/3.jpg",
              },
            ].map((member, index) => (
              <Grid size={{ xs: 12, sm: 4 }} key={index}>
                <Card elevation={3} sx={{ textAlign: "center", p: 3 }}>
                  <Avatar
                    src={member.avatar}
                    sx={{
                      width: 120,
                      height: 120,
                      mx: "auto",
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" gutterBottom>
                    {member.name}
                  </Typography>
                  <Typography color="primary" gutterBottom>
                    {member.role}
                  </Typography>
                  <Chip
                    label={member.expertise}
                    color="secondary"
                    size="small"
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box> */}

      {/* CTA Section */}
      {/* <Box bgcolor="primary.main" color="white" py={10} textAlign="center">
        <Container maxWidth="md">
          <Typography variant="h3" gutterBottom>
            Ready to Transform Your Lead Management?
          </Typography>
          <Typography variant="h5" paragraph>
            Schedule a personalized demo with our experts
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ mt: 3, px: 6, py: 2 }}
            href="/demo"
          >
            Request a Demo
          </Button>
        </Container>
      </Box> */}

      <Footer />
    </>
  );
};

export default ContactPage;
