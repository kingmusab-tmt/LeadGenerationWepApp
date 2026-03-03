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

const PrivacyInformationPage = () => {
  const privacySections = [
    {
      title: "1) Scope and Applicability",
      points: [
        "This Privacy Information explains how BRIXCOT collects, uses, shares, retains, and protects personal data processed through our lead management platform.",
        "It applies to website visitors, buyers, sellers, administrators, and users of connected services and integrations.",
        "This notice should be read together with our Terms of Service, Legal, Cookie Preferences, and Your Privacy Choices pages.",
      ],
    },
    {
      title: "2) Categories of Data We Collect",
      points: [
        "Account and profile information (name, email, phone, role, company details).",
        "Lead and contact information submitted, imported, purchased, sold, or assigned through the platform.",
        "Transaction, billing, subscription, and payment-related records.",
        "Usage, device, log, and analytics information used for security, diagnostics, and service improvements.",
      ],
    },
    {
      title: "3) How We Use Personal Data",
      points: [
        "To provide, operate, and secure the platform and core lead management features.",
        "To process assignments, notifications, workflows, reporting, and customer support.",
        "To prevent fraud, detect abuse, enforce policies, and maintain platform integrity.",
        "To comply with legal obligations and respond to lawful requests from authorities.",
      ],
    },
    {
      title: "4) UK/EU Legal Bases for Processing",
      points: [
        "For UK/EU data, we process personal data under one or more lawful bases, such as contract necessity, legitimate interests, consent, or legal obligation.",
        "Where consent is relied upon, users can withdraw consent at any time without affecting prior lawful processing.",
        "Legitimate interests are balanced against individual rights and supported by appropriate safeguards.",
      ],
    },
    {
      title: "5) US Privacy Disclosures",
      points: [
        "For US users, privacy rights and disclosures may vary by state law, including rights to know/access, delete, correct, and opt out of certain uses or sharing.",
        "BRIXCOT does not sell personal data in exchange for money unless explicitly disclosed and lawfully permitted.",
        "Where required, we provide state-law disclosures regarding categories of data processed and applicable rights request methods.",
      ],
    },
    {
      title: "6) Data Sharing and Service Providers",
      points: [
        "We may share data with vetted providers supporting hosting, payments, communications, analytics, and operational functions.",
        "Service providers are contractually required to process data according to instructions and applicable legal requirements.",
        "We may disclose data when required by law, to protect rights/safety, or in connection with business restructuring events where legally permitted.",
      ],
    },
    {
      title: "7) Cross-Border Transfers",
      points: [
        "Data may be processed in countries outside the original collection jurisdiction due to global infrastructure and support operations.",
        "For UK/EU transfers, we use recognized safeguards where required, such as adequacy mechanisms and contractual protections.",
        "For US-related transfers and processing, we apply contractual and organizational safeguards aligned with applicable law.",
      ],
    },
    {
      title: "8) Data Retention and Deletion",
      points: [
        "We retain personal data for as long as needed to provide services, meet contractual obligations, resolve disputes, and satisfy legal requirements.",
        "Retention schedules consider data sensitivity, business purpose, and legal or regulatory obligations.",
        "When data is no longer required, it is deleted, anonymized, or securely archived according to policy.",
      ],
    },
    {
      title: "9) Security Measures",
      points: [
        "We implement reasonable administrative, technical, and organizational controls to protect data against unauthorized access, alteration, disclosure, or destruction.",
        "Examples include access controls, authentication safeguards, monitoring, and secure infrastructure practices.",
        "No method of transmission or storage is fully secure; users share responsibility for account security and safe operational practices.",
      ],
    },
    {
      title: "10) Your Rights and Choices",
      points: [
        "UK/EU data subjects may have rights including access, rectification, erasure, restriction, objection, and portability where applicable.",
        "US users may have state-law rights, including rights to know, access, correct, delete, and opt out of certain processing/sharing.",
        "You can submit privacy requests through available support channels; we may verify identity before fulfilling requests.",
      ],
    },
    {
      title: "11) Cookies and Tracking Technologies",
      points: [
        "We use cookies and similar technologies for essential functionality, performance, analytics, and personalization.",
        "Non-essential tracking can be managed through Cookie Preferences and browser/device settings where applicable.",
        "Please review Cookie Preferences for category-level controls and additional details.",
      ],
    },
    {
      title: "12) Updates to this Privacy Information",
      points: [
        "We may update this notice from time to time to reflect legal, technical, or business changes.",
        "Material updates may be highlighted via platform notices or other reasonable communication channels.",
        "Continued use of the service after updates indicates acknowledgment of the revised notice, where permitted by law.",
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
              Privacy Information
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Last updated: March 3, 2026
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We are committed to transparency and responsible data practices.
              This page outlines how personal data is handled across BRIXCOT for
              UK/EU and US operations.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              This page provides privacy transparency and operational guidance.
              It does not replace legal advice for specific jurisdictions.
            </Alert>

            <Stack spacing={3}>
              {privacySections.map((section) => (
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
              <AppLink href="/terms-of-service" underline="hover">
                Terms of Service
              </AppLink>
              <AppLink href="/cookie-preferences" underline="hover">
                Cookie Preferences
              </AppLink>
              <AppLink href="/your-privacy-choices" underline="hover">
                Your Privacy Choices
              </AppLink>
              <AppLink href="/responsible-disclosure" underline="hover">
                Responsible Disclosure
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

export default PrivacyInformationPage;
