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

const ResponsibleDisclosurePage = () => {
  const disclosureSections = [
    {
      title: "1) Purpose and Scope",
      points: [
        "BRIXCOT welcomes responsible reports of potential security vulnerabilities affecting our website, APIs, dashboards, and supporting services.",
        "This policy applies to security testing performed in good faith and designed to improve platform safety.",
        "Testing must avoid disruption, unauthorized data access, privacy violations, or service degradation.",
      ],
    },
    {
      title: "2) What to Report",
      points: [
        "Authentication and authorization weaknesses, privilege escalation, and account takeover vectors.",
        "Sensitive data exposure, injection flaws, insecure direct object references, and logic abuse risks.",
        "Infrastructure or integration weaknesses that could materially impact confidentiality, integrity, or availability.",
      ],
    },
    {
      title: "3) Testing Rules and Prohibited Actions",
      points: [
        "Do not access, modify, export, or delete data that does not belong to your own test account.",
        "Do not conduct denial-of-service attacks, spam campaigns, social engineering, or physical attacks.",
        "Do not exploit a vulnerability beyond the minimum required to demonstrate impact.",
      ],
    },
    {
      title: "4) Report Submission Requirements",
      points: [
        "Include clear reproduction steps, affected endpoint/page, expected vs actual behavior, and potential impact.",
        "Provide proof-of-concept details, timestamps, environment context, and supporting logs/screenshots when possible.",
        "Include contact details for follow-up and coordinated remediation communication.",
      ],
    },
    {
      title: "5) Coordinated Disclosure Timeline",
      points: [
        "Allow reasonable remediation time before public disclosure so risks can be contained and fixed responsibly.",
        "We may request additional validation details during triage and remediation.",
        "Public disclosure should occur only after coordination and agreement, except where law requires otherwise.",
      ],
    },
    {
      title: "6) Safe Harbor (Good Faith Research)",
      points: [
        "BRIXCOT will not pursue legal action for good-faith research that complies with this policy and applicable law.",
        "Researchers must immediately stop testing and notify us if unintended access to non-public data occurs.",
        "This safe harbor does not cover malicious behavior, data exfiltration, service disruption, or legal/regulatory violations.",
      ],
    },
    {
      title: "7) UK/EU + US Legal Considerations",
      points: [
        "Researchers must comply with applicable cybercrime, privacy, and communications laws in their jurisdiction.",
        "For UK/EU contexts, reporting and handling should support GDPR/UK GDPR data protection duties where personal data is implicated.",
        "For US contexts, reporting and handling should support applicable federal/state requirements related to unauthorized access and breach handling.",
      ],
    },
    {
      title: "8) Incident Response and Notification",
      points: [
        "Validated reports enter internal triage, risk scoring, containment, remediation, and post-incident review processes.",
        "Where legally required, affected parties and authorities may be notified within required timelines.",
        "We maintain records of security events to support accountability, audits, and continuous improvement.",
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
              Responsible Disclosure
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Last updated: March 3, 2026
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              If you identify a potential security issue, report it in good
              faith so we can investigate, remediate, and protect users.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              This policy supports coordinated vulnerability disclosure and does
              not authorize testing that violates law or harms users/services.
            </Alert>

            <Stack spacing={3}>
              {disclosureSections.map((section) => (
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

export default ResponsibleDisclosurePage;
