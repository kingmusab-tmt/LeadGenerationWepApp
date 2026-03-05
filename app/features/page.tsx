import {
  Box,
  Button,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";
import HeroGradient from "../components/generalComponent/HeroGradient";
import FeatureCardsGrid from "../components/generalComponent/FeatureCardsGrid";

const keyBenefits = [
  "Capture and qualify leads faster",
  "Reduce manual operations with automation",
  "Increase buyer conversion and lead value",
  "Scale with integrations and API connectivity",
  "Improve trust with secure, auditable workflows",
];

const FeaturesPage = () => {
  return (
    <>
      <Header />

      <HeroGradient>
        <Container maxWidth="lg">
          <Stack spacing={2} textAlign="center">
            <Typography variant="h3" fontWeight={800}>
              BRIXCOT Features
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Everything you need to capture, manage, distribute, and monetize
              leads.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              pt={1}
            >
              <Button variant="contained" color="primary" href="/pricing">
                View Pricing
              </Button>
              <Button
                variant="outlined"
                color="primary"
                href="/auth/sign-in?trial=true"
              >
                Try it for Free
              </Button>
            </Stack>
          </Stack>
        </Container>
      </HeroGradient>

      <Box py={8} bgcolor="background.default">
        <Container maxWidth="lg">
          <FeatureCardsGrid />
        </Container>
      </Box>

      <Box py={8} bgcolor="background.paper">
        <Container maxWidth="md">
          <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
            <Typography
              variant="h4"
              fontWeight={800}
              gutterBottom
              color="primary.main"
            >
              Why Teams Choose BRIXCOT
            </Typography>
            <List>
              {keyBenefits.map((benefit) => (
                <ListItem key={benefit} disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={benefit} />
                </ListItem>
              ))}
            </List>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={2}>
              <Button
                variant="contained"
                color="primary"
                href="/auth/sign-in?trial=true"
              >
                Start Free Trial
              </Button>
              <Button variant="outlined" href="/contact">
                Contact Sales
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>

      <Footer />
    </>
  );
};

export default FeaturesPage;
