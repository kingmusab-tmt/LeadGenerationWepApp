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
  IconButton,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/BRIXCOT.png";
import {
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";

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
            {/* <Button
              variant="contained"
              color="primary"
              component={Link}
              href="/demo"
              sx={{ mt: 1 }}
            >
              Request Demo
            </Button> */}
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Product
            </Typography>
            <List dense>
              {["Features", "Pricing"].map((text) => (
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
              {["Blog", "Contact"].map((text) => (
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            mt: 3,
          }}
        >
          {[
            {
              href: "https://facebook.com",
              icon: <FaFacebook size={18} />,
              label: "Facebook",
            },
            {
              href: "https://twitter.com",
              icon: <FaTwitter size={18} />,
              label: "Twitter",
            },
            {
              href: "https://linkedin.com",
              icon: <FaLinkedin size={18} />,
              label: "LinkedIn",
            },
            {
              href: "https://instagram.com",
              icon: <FaInstagram size={18} />,
              label: "Instagram",
            },
            {
              href: "https://youtube.com",
              icon: <FaYoutube size={18} />,
              label: "YouTube",
            },
          ].map((social) => (
            <IconButton
              key={social.label}
              component="a"
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "primary.main",
                  backgroundColor: "action.hover",
                },
              }}
            >
              {social.icon}
            </IconButton>
          ))}
        </Box>
        <Divider sx={{ my: 4 }} />
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: { xs: 1.5, md: 2.5 },
            mb: 3,
          }}
        >
          {[
            { label: "Legal", href: "/legal" },
            { label: "Terms of Service", href: "/terms-of-service" },
            { label: "Privacy Information", href: "/privacy-information" },
            {
              label: "Responsible Disclosure",
              href: "/responsible-disclosure",
            },
            { label: "Trust", href: "/trust" },
            { label: "Cookie Preferences", href: "/cookie-preferences" },
            { label: "Your Privacy Choices", href: "/your-privacy-choices" },
          ].map((linkItem) => (
            <MuiLink
              key={linkItem.href}
              component={Link}
              href={linkItem.href}
              color="text.secondary"
              underline="hover"
              sx={{
                fontSize: "0.85rem",
                transition: "color 0.2s",
                "&:hover": { color: "primary.main" },
              }}
            >
              {linkItem.label}
            </MuiLink>
          ))}
          <MuiLink
            component="button"
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event("open-cookie-preferences"))
            }
            color="text.secondary"
            underline="hover"
            sx={{
              fontSize: "0.85rem",
              transition: "color 0.2s",
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
            }}
          >
            Cookie Settings
          </MuiLink>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            textAlign: { xs: "center", md: "left" },
            px: { xs: 2, md: 3 },
            py: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.dark} 100%)`,
          }}
        >
          <Typography variant="body2" sx={{ color: "common.white" }}>
            © {new Date().getFullYear()} BRIXCOT. All rights reserved.
          </Typography>
          <Typography variant="body2" sx={{ color: "common.white" }}>
            Developed by{" "}
            <MuiLink
              href="https://triplemultipurposetechnology.com.ng"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "common.white", fontWeight: 700 }}
              underline="hover"
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
