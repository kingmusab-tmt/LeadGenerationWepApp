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

const TrustPage = () => {
  const trustSections = [
    {
      title: "1) Trust and Security Commitment",
      points: [
        "BRIXCOT is designed to support secure, reliable, and compliant lead management operations.",
        "We continuously improve controls for confidentiality, integrity, and availability of platform services.",
        "Security and privacy are integrated into product, infrastructure, and operational processes.",
      ],
    },
    {
      title: "2) Platform Security Controls",
      points: [
        "Role-based access control and least-privilege principles are used to limit unauthorized access.",
        "Authentication and account protections are applied to reduce credential misuse and account takeover risk.",
        "Monitoring and logging controls support anomaly detection, incident triage, and auditability.",
      ],
    },
    {
      title: "3) Data Protection Practices",
      points: [
        "Data handling follows purpose limitation and minimization principles where feasible.",
        "Data retention and deletion practices are aligned with business need and legal requirements.",
        "Vendor and integration relationships are managed with contractual and operational safeguards.",
      ],
    },
    {
      title: "4) Privacy Governance (UK/EU + US)",
      points: [
        "For UK/EU contexts, controls are designed to support GDPR/UK GDPR principles, including transparency and rights management.",
        "For US contexts, controls support applicable federal/state privacy and marketing compliance obligations.",
        "Customers remain responsible for lawful campaign configuration and jurisdiction-specific obligations for their use cases.",
      ],
    },
    {
      title: "5) Operational Resilience",
      points: [
        "Service health is monitored to maintain uptime, performance, and incident response readiness.",
        "Change management and release practices are used to reduce operational risk.",
        "We review and improve resilience controls as platform complexity and customer needs evolve.",
      ],
    },
    {
      title: "6) Incident Response and Disclosure",
      points: [
        "Security events are assessed through defined workflows covering detection, containment, remediation, and review.",
        "Where legally required, notifications are issued to affected parties and authorities within required timelines.",
        "Responsible Disclosure supports coordinated reporting by security researchers.",
      ],
    },
    {
      title: "7) User and Customer Responsibilities",
      points: [
        "Customers should implement strong access hygiene, consent-compliant lead sourcing, and lawful outreach practices.",
        "Users are responsible for safeguarding credentials and promptly reporting suspected misuse.",
        "Customers should review legal pages regularly and configure controls based on their jurisdiction and operational model.",
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
              Trust
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Last updated: March 3, 2026
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Trust, security, and compliance are core to BRIXCOT’s lead
              management platform operations across UK/EU and US contexts.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              This Trust page provides a transparency overview of our controls
              and governance approach; it does not replace customer-specific
              legal, security, or regulatory advice.
            </Alert>

            <Stack spacing={3}>
              {trustSections.map((section) => (
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
              <AppLink href="/privacy-information" underline="hover">
                Privacy Information
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
            </Stack>
          </Paper>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default TrustPage;
