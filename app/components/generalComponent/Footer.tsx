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
    <Box component="footer" bgcolor="background.paper" py={6}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" mb={2}>
              <Image
                src={logo} // Update this path to your actual logo
                alt="LeadConnect Pro Logo"
                width={40}
                height={40}
                style={{ marginRight: theme.spacing(2) }}
              />
              <Typography variant="h6">BRIXCOT</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              The complete solution for modern lead management and distribution.
            </Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" gutterBottom>
              Product
            </Typography>
            <List dense>
              {["Features", "Pricing", "Integrations"].map((text) => (
                <ListItem key={text} disableGutters>
                  <Link href={`/${text.toLowerCase()}`} passHref>
                    <MuiLink color="text.secondary">{text}</MuiLink>
                  </Link>
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" gutterBottom>
              Resources
            </Typography>
            <List dense>
              {["Documentation", "Blog", "Support"].map((text) => (
                <ListItem key={text} disableGutters>
                  <Link href={`/${text.toLowerCase()}`} passHref>
                    <MuiLink color="text.secondary">{text}</MuiLink>
                  </Link>
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Contact Us
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: info@leadconnectpro.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phone: (555) 123-4567
            </Typography>
            <Box mt={2}>
              <Button
                variant="contained"
                color="primary"
                component={Link}
                href="/demo"
              >
                Request Demo
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ my: 4 }} />
        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} LeadConnect Pro. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};
export default Footer;
