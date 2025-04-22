// components/TawkChatWidget.tsx
"use client";
import { useEffect } from "react";
import { Box, Typography } from "@mui/material";

type TawkChatWidgetProps = {
  open: boolean;
};

const TawkChatWidget: React.FC<TawkChatWidgetProps> = ({ open }) => {
  useEffect(() => {
    if (!open) return;

    const existingScript = document.querySelector('script[src*="tawk.to"]');
    if (existingScript) return; // Prevent duplicate loading

    const script = document.createElement("script");
    script.src = "https://embed.tawk.to/680802d85a57ed19170a05a8/1ipfkm7u8";
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);

    return () => {
      // Optional: you can remove it or keep it for global persistence
      // document.body.removeChild(script);
    };
  }, [open]);

  return open ? (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>
        Live Chat Widget
      </Typography>
      <Typography variant="body2" color="text.secondary">
        The Tawk.to chat widget has been loaded.
      </Typography>
    </Box>
  ) : null;
};

export default TawkChatWidget;
