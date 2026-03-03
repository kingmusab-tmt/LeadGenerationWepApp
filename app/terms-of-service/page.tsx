import {
  Box,
  Container,
  Divider,
  Stack,
  List,
  ListItem,
  Paper,
  Typography,
  Alert,
} from "@mui/material";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";
import AppLink from "../components/generalComponent/AppLink";

const TermsOfServicePage = () => {
  const termSections = [
    {
      title: "1) Acceptance of Terms",
      points: [
        "By accessing or using BRIXCOT, you agree to be bound by these Terms of Service and all referenced policies.",
        "If you use the platform on behalf of an organization, you represent that you are authorized to bind that organization to these terms.",
        "If you do not agree with these terms, you must discontinue use of the service.",
      ],
    },
    {
      title: "2) Eligibility and Account Responsibilities",
      points: [
        "You must provide accurate registration information and keep account details up to date.",
        "You are responsible for safeguarding credentials, enabling security controls, and all activity occurring under your account.",
        "You must promptly notify BRIXCOT of suspected unauthorized access or account misuse.",
      ],
    },
    {
      title: "3) Platform Scope and Permitted Use",
      points: [
        "BRIXCOT provides lead intake, assignment, purchase/sale workflows, automation, analytics, and integration capabilities.",
        "You may use the platform only for lawful business purposes and in accordance with these terms and applicable law.",
        "You may not reverse engineer, interfere with service operations, or attempt to bypass security or subscription controls.",
      ],
    },
    {
      title: "4) Lead Data and Compliance Obligations",
      points: [
        "You are responsible for ensuring all lead data submitted to or processed through the platform is lawfully obtained and used.",
        "For UK/EU operations, you must ensure GDPR/UK GDPR compliance, including lawful basis, transparency, and data subject rights handling.",
        "For US operations, you must comply with applicable federal and state requirements, including communications and privacy rules relevant to your campaigns.",
      ],
    },
    {
      title: "5) Communications Compliance (Email/SMS/Calling)",
      points: [
        "You must configure outreach to honor consent scope, suppression lists, and do-not-contact preferences.",
        "Marketing communications must include required disclosures, sender identification, and compliant opt-out mechanisms.",
        "Use of the platform for spam, unlawful solicitation, deceptive marketing, or prohibited telemarketing activity is strictly forbidden.",
      ],
    },
    {
      title: "6) Fees, Billing, and Subscription Terms",
      points: [
        "Paid features, wallet credits, and subscription plans are billed according to the plan details shown at purchase.",
        "You authorize BRIXCOT and its payment partners to charge applicable fees, taxes, and recurring charges where enabled.",
        "Unless otherwise required by law, payments are non-refundable except as expressly stated in applicable plan or refund terms.",
      ],
    },
    {
      title: "7) Third-Party Services and Integrations",
      points: [
        "The platform may interoperate with third-party tools (for example, payment processors, messaging providers, and analytics vendors).",
        "Your use of third-party services is subject to those providers’ terms and privacy policies.",
        "BRIXCOT is not responsible for outages, data handling, or losses caused by third-party providers outside its control.",
      ],
    },
    {
      title: "8) Data Security and Incident Handling",
      points: [
        "BRIXCOT applies reasonable administrative, technical, and organizational safeguards for platform security.",
        "You acknowledge no service can guarantee absolute security and agree to maintain your own safeguards and incident readiness.",
        "Security events are handled using response procedures, and notifications are provided where legally required.",
      ],
    },
    {
      title: "9) Intellectual Property",
      points: [
        "BRIXCOT and related branding, software, and content are protected by intellectual property laws and remain property of their respective owners.",
        "You retain rights to your uploaded content and data, subject to licenses necessary for BRIXCOT to provide the service.",
        "You may not use BRIXCOT marks or proprietary content without prior written permission.",
      ],
    },
    {
      title: "10) Suspension and Termination",
      points: [
        "BRIXCOT may suspend or terminate access for non-payment, legal violations, abuse, fraud, or security risks.",
        "You may stop using the service at any time, subject to outstanding payment and contractual obligations.",
        "Upon termination, access may be restricted and data handling will follow applicable retention, deletion, and legal requirements.",
      ],
    },
    {
      title: "11) Disclaimers and Limitation of Liability",
      points: [
        "The service is provided on an 'as is' and 'as available' basis, to the extent permitted by law.",
        "To the maximum extent permitted by applicable law, BRIXCOT disclaims implied warranties and limits liability for indirect or consequential losses.",
        "Nothing in these terms excludes liability that cannot be limited under applicable law.",
      ],
    },
    {
      title: "12) Governing Law, Venue, and Updates",
      points: [
        "These terms are governed by the law specified in your customer agreement or, where absent, applicable governing law determined by BRIXCOT’s contracting entity.",
        "Where legally valid, disputes are resolved in agreed courts/arbitration venues, without prejudice to mandatory consumer protections.",
        "BRIXCOT may update these terms from time to time; continued use after effective date constitutes acceptance of updated terms.",
      ],
    },
  ];

  return (
    <>
      <Header />
      <Box sx={{ py: { xs: 5, md: 8 }, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }} elevation={1}>
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Terms of Service
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Last updated: March 3, 2026
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              These terms define the legal conditions for use of BRIXCOT,
              including UK/EU and US compliance expectations relevant to lead
              management operations.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              This page is provided for legal transparency and operational
              clarity. It does not replace legal advice for your specific
              jurisdiction or use case.
            </Alert>

            <Stack spacing={3}>
              {termSections.map((section) => (
                <Box key={section.title}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {section.title}
                  </Typography>
                  <List dense sx={{ pl: 2 }}>
                    {section.points.map((point) => (
                      <ListItem
                        key={point}
                        sx={{ display: "list-item", py: 0.3 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {point}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 4 }} />

            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Related Legal Pages
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              flexWrap="wrap"
            >
              <AppLink href="/legal" underline="hover">
                Legal
              </AppLink>
              <AppLink href="/privacy-information" underline="hover">
                Privacy Information
              </AppLink>
              <AppLink href="/responsible-disclosure" underline="hover">
                Responsible Disclosure
              </AppLink>
              <AppLink href="/cookie-preferences" underline="hover">
                Cookie Preferences
              </AppLink>
              <AppLink href="/your-privacy-choices" underline="hover">
                Your Privacy Choices
              </AppLink>
              <AppLink href="/trust" underline="hover">
                Trust
              </AppLink>
            </Stack>
          </Paper>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default TermsOfServicePage;
