import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
  Stack,
  List,
  ListItem,
  Alert,
} from "@mui/material";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";
import AppLink from "../components/generalComponent/AppLink";

const LegalPage = () => {
  const legalSections = [
    {
      title: "1) Company and Service Information",
      points: [
        "BRIXCOT provides a lead management system for lead intake, distribution, qualification, follow-up automation, and reporting.",
        "This legal notice applies to all users, including buyers, sellers, administrators, and integrated third-party service providers.",
        "Use of the platform is also governed by our Terms of Service, Privacy Information, Cookie Preferences, Responsible Disclosure, Trust, and Your Privacy Choices pages.",
      ],
    },
    {
      title: "2) Regulatory and Compliance Framework",
      points: [
        "The platform is operated with controls designed to align with UK/EU and US lead-management compliance expectations, including consent, purpose limitation, data minimization, transparency, and accountability.",
        "For UK/EU operations, relevant obligations may include GDPR and UK GDPR principles (lawful basis, data subject rights, transfer safeguards, and processor accountability).",
        "For US operations, relevant obligations may include state privacy laws (such as CCPA/CPRA and other applicable state statutes) and communications rules (such as CAN-SPAM and TCPA).",
        "Customers remain responsible for configuring and using the system in a manner that satisfies laws applicable to their jurisdiction, industry, and campaign practices.",
      ],
    },
    {
      title: "3) Lawful Lead Collection and Consent Requirements",
      points: [
        "Users must only submit, import, purchase, sell, or distribute leads collected through lawful and transparent means.",
        "For each lead source, users should maintain records of consent language, capture timestamp, collection method, source URL/form, and communication preferences.",
        "Leads must not be contacted outside declared consent scope (channel, frequency, and purpose), and do-not-contact preferences must be honored promptly.",
      ],
    },
    {
      title: "4) Data Processing, Retention, and Deletion",
      points: [
        "Lead and account data is processed for operational purposes including assignment, scoring, analytics, fraud/risk monitoring, and billing records.",
        "Retention periods should be risk-based and purpose-limited; data no longer required should be deleted or anonymized according to policy and legal obligations.",
        "Users must not retain sensitive or special-category data unless explicitly allowed by law and contract with documented safeguards.",
      ],
    },
    {
      title: "5) Security and Access Controls",
      points: [
        "Administrative, technical, and organizational safeguards are expected, including least-privilege access, secure authentication, activity logging, and periodic access review.",
        "Users are responsible for account credential security and must report suspected compromise or unauthorized access immediately.",
        "No system can guarantee absolute security; however, BRIXCOT applies reasonable safeguards appropriate for a commercial lead management environment.",
      ],
    },
    {
      title: "6) Data Sharing, Subprocessors, and Cross-Border Transfers",
      points: [
        "Data may be processed by approved infrastructure and service partners for hosting, messaging, analytics, and payment operations.",
        "For UK/EU personal data transfers, organizations should apply legally recognized transfer mechanisms (for example, adequacy decisions and standard contractual clauses where applicable).",
        "For US data, organizations should apply contractual and operational safeguards consistent with applicable state and federal requirements.",
        "Users should ensure vendor due diligence and contractual coverage where they independently connect third-party integrations.",
      ],
    },
    {
      title: "7) Communications and Marketing Compliance",
      points: [
        "Email and SMS communications must include required disclosures, sender identification, and unsubscribe/opt-out controls as required by applicable law.",
        "UK/EU direct marketing should be configured to honor consent or lawful basis requirements and suppression preferences.",
        "US outreach should be configured to honor CAN-SPAM/TCPA rules and applicable state marketing and telemarketing requirements.",
        "Automated outreach workflows must be configured to respect suppression lists and communication consent status.",
        "Users are prohibited from using the platform for unlawful solicitation, deceptive marketing, spam, or harassment.",
      ],
    },
    {
      title: "8) User Rights and Privacy Requests",
      points: [
        "UK/EU users may have rights including access, rectification, erasure, restriction, objection, and (where applicable) portability.",
        "US users may have privacy rights depending on state law, including rights to know, delete, correct, and opt out of certain data uses/sharing.",
        "Requests should be handled within required timeframes and documented for accountability.",
        "Users should route privacy preference updates through the appropriate controls and suppression mechanisms.",
      ],
    },
    {
      title: "9) Incident Response and Vulnerability Reporting",
      points: [
        "Security incidents should be triaged, contained, investigated, and documented according to a defined response process.",
        "Where legally required, affected parties and regulators should be notified within prescribed UK/EU and US legal timelines.",
        "Potential vulnerabilities should be reported through our Responsible Disclosure process.",
      ],
    },
    {
      title: "10) Contractual, Liability, and Enforcement",
      points: [
        "Service use is subject to contractual limitations, payment obligations, and policy enforcement rights defined in Terms of Service.",
        "Accounts may be restricted or suspended for legal violations, abuse, fraud, or significant policy breaches.",
        "This page provides a legal overview and operational standard; it does not replace jurisdiction-specific legal advice.",
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
              Legal
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Last updated: March 3, 2026
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              This legal page summarizes key legal and compliance obligations
              for a modern lead management system standard, with specific
              alignment guidance for UK/EU and US operations.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              This content is provided for platform transparency and compliance
              orientation. It does not constitute legal advice.
            </Alert>

            <Stack spacing={3}>
              {legalSections.map((section) => (
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
              <AppLink href="/terms-of-service" underline="hover">
                Terms of Service
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

export default LegalPage;
