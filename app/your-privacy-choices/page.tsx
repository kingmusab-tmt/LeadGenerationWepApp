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

const YourPrivacyChoicesPage = () => {
  const privacyChoiceSections = [
    {
      title: "1) Overview of Your Privacy Choices",
      points: [
        "BRIXCOT provides controls that allow users to manage personal data preferences and applicable privacy rights.",
        "Available rights and options may vary based on your location, account type, and legal requirements.",
        "We process privacy requests in line with applicable law and documented operational procedures.",
      ],
    },
    {
      title: "2) UK/EU Privacy Rights",
      points: [
        "If GDPR or UK GDPR applies, you may have rights to access, rectify, erase, restrict, object, and request portability where applicable.",
        "You may also withdraw consent where processing relies on consent, without affecting prior lawful processing.",
        "You may have the right to lodge a complaint with a relevant supervisory authority.",
      ],
    },
    {
      title: "3) US Privacy Rights",
      points: [
        "Depending on applicable state law, you may have rights to know/access, correct, delete, and opt out of certain data use or sharing.",
        "You may also have rights regarding targeted advertising and profiling in certain contexts.",
        "Where required by law, we provide non-discrimination protections for exercising eligible privacy rights.",
      ],
    },
    {
      title: "4) How to Submit a Privacy Request",
      points: [
        "Submit requests through designated support/contact channels and include enough information to identify your account and request type.",
        "We may require identity verification to protect account security and prevent unauthorized disclosures.",
        "Authorized-agent requests may require additional documentation where permitted or required by law.",
      ],
    },
    {
      title: "5) Managing Communication Preferences",
      points: [
        "You can manage marketing email/SMS preferences using unsubscribe links and account settings where available.",
        "Transactional and service-critical communications may still be sent where necessary for account and platform operations.",
        "Suppression and opt-out requests are processed according to legal and operational timelines.",
      ],
    },
    {
      title: "6) Cookie and Tracking Choices",
      points: [
        "Non-essential cookie and tracking preferences can be managed in Cookie Preferences.",
        "Browser-level controls may provide additional ways to block, clear, or limit tracking technologies.",
        "Some essential technologies remain active to support security, authentication, and core platform functionality.",
      ],
    },
    {
      title: "7) Request Timelines and Outcomes",
      points: [
        "We acknowledge and process requests within applicable legal response windows.",
        "Where a request cannot be fulfilled in full, we provide a lawful reason and available next steps.",
        "Complex or repeated requests may require additional processing time where legally permitted.",
      ],
    },
    {
      title: "8) Appeals and Complaints",
      points: [
        "If you disagree with a request outcome, you may contact us to seek review or submit an appeal where available.",
        "US users may have state-law appeal rights depending on jurisdiction.",
        "UK/EU users may contact relevant data protection authorities where applicable.",
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
              Your Privacy Choices
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Last updated: March 3, 2026
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              This page explains available controls and rights for managing your
              personal data across BRIXCOT, including UK/EU and US privacy
              frameworks.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Rights availability may vary by jurisdiction and context. Identity
              verification may be required before request fulfillment.
            </Alert>

            <Stack spacing={3}>
              {privacyChoiceSections.map((section) => (
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

export default YourPrivacyChoicesPage;
