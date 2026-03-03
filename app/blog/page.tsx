import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Header from "../components/generalComponent/Header";
import Footer from "../components/generalComponent/Footer";
import HeroGradient from "../components/generalComponent/HeroGradient";

const blogPosts = [
  {
    title: "How AI Lead Scoring Increases Conversion Rates",
    excerpt:
      "Learn how automated lead scoring helps sales teams prioritize high-intent prospects and reduce wasted effort.",
    category: "AI & Automation",
    date: "March 2026",
  },
  {
    title: "Best Practices for Lead Distribution at Scale",
    excerpt:
      "Explore routing strategies like round-robin, priority queues, and geo-based assignment for faster response times.",
    category: "Lead Operations",
    date: "March 2026",
  },
  {
    title: "Building Compliant Email and SMS Campaigns",
    excerpt:
      "A practical guide to creating high-performing outreach campaigns while maintaining consent and compliance standards.",
    category: "Marketing",
    date: "March 2026",
  },
  {
    title: "Lead Marketplace Strategy for Sellers and Buyers",
    excerpt:
      "Understand pricing, quality visibility, and transaction workflows to maximize value in a lead marketplace.",
    category: "Marketplace",
    date: "March 2026",
  },
  {
    title: "Integrating BRIXCOT with Your Existing Stack",
    excerpt:
      "See how to connect CRMs, ad platforms, and reporting tools using native integrations and Zapier automations.",
    category: "Integrations",
    date: "March 2026",
  },
  {
    title: "KPIs Every Lead Management Team Should Track",
    excerpt:
      "Track the metrics that matter most: lead quality, speed-to-contact, conversion, CAC, and revenue impact.",
    category: "Analytics",
    date: "March 2026",
  },
];

const BlogPage = () => {
  return (
    <>
      <Header />

      <HeroGradient>
        <Container maxWidth="lg">
          <Stack spacing={2} textAlign="center">
            <Typography variant="h3" fontWeight={800}>
              BRIXCOT Blog
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Insights, strategies, and best practices for modern lead
              management teams.
            </Typography>
          </Stack>
        </Container>
      </HeroGradient>

      <Box py={8} bgcolor="background.default">
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {blogPosts.map((post) => (
              <Grid size={{ xs: 12, md: 6 }} key={post.title}>
                <Card
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1.5}
                    >
                      <Chip
                        label={post.category}
                        color="primary"
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {post.date}
                      </Typography>
                    </Stack>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      {post.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {post.excerpt}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box textAlign="center" mt={5}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              More articles coming soon.
            </Typography>
            <Button variant="contained" href="/contact">
              Request a Topic
            </Button>
          </Box>
        </Container>
      </Box>

      <Footer />
    </>
  );
};

export default BlogPage;
