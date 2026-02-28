"use client";
import React from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  List,
  ListItem,
  Divider,
  useTheme,
  Link as MuiLink,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/BRIXCOT.png";

// Footer Component
const Footer = () => {
  const theme = useTheme();
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "background.paper",
        py: { xs: 6, md: 8 },
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 4 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Image
                src={logo}
                alt="BRIXCOT Logo"
                width={40}
                height={40}
                style={{ marginRight: theme.spacing(2) }}
              />
              <Typography variant="h6" fontWeight={700}>
                BRIXCOT
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The complete solution for modern lead management and distribution.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              href="/demo"
              sx={{ mt: 1 }}
            >
              Request Demo
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Product
            </Typography>
            <List dense>
              {["Features", "Pricing", "Integrations"].map((text) => (
                <ListItem key={text} disableGutters>
                  <MuiLink
                    component={Link}
                    href={`/${text.toLowerCase()}`}
                    color="text.secondary"
                    underline="hover"
                    sx={{
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    {text}
                  </MuiLink>
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Resources
            </Typography>
            <List dense>
              {["Documentation", "Blog", "Support"].map((text) => (
                <ListItem key={text} disableGutters>
                  <MuiLink
                    component={Link}
                    href={`/${text.toLowerCase()}`}
                    color="text.secondary"
                    underline="hover"
                    sx={{
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    {text}
                  </MuiLink>
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Contact Us
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: support@brixcot.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phone: +1 (555) 123-4567
            </Typography>
            <Box mt={2.5}>
              <MuiLink
                component={Link}
                href="/contact"
                underline="hover"
                color="primary.main"
                fontWeight={600}
              >
                Contact our team
              </MuiLink>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ my: 4 }} />
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            textAlign: { xs: "center", md: "left" },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} BRIXCOT. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Developed by{" "}
            <MuiLink
              href="https://triplemultipurposetechnology.com.ng"
              target="_blank"
              rel="noopener noreferrer"
              color="primary.main"
              underline="hover"
              fontWeight={600}
            >
              Triple Multipurpose Technology
            </MuiLink>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
export default Footer;
