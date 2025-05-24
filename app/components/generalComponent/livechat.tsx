// // components/TawkChatWidget.tsx
// "use client";
// import { useEffect } from "react";
// import { Box, Typography } from "@mui/material";

// type TawkChatWidgetProps = {
//   open: boolean;
// };

// const TawkChatWidget: React.FC<TawkChatWidgetProps> = ({ open }) => {
//   useEffect(() => {
//     if (!open) return;

//     const existingScript = document.querySelector('script[src*="tawk.to"]');
//     if (existingScript) return; // Prevent duplicate loading

//     const script = document.createElement("script");
//     script.src = "https://embed.tawk.to/680802d85a57ed19170a05a8/1ipfkm7u8";
//     script.async = true;
//     script.charset = "UTF-8";
//     script.setAttribute("crossorigin", "*");
//     document.body.appendChild(script);

//     return () => {
//       // Optional: you can remove it or keep it for global persistence
//       // document.body.removeChild(script);
//     };
//   }, [open]);

//   return null;
//   // open ? (
//   //   <Box p={2}>
//   //     <Typography variant="h6" gutterBottom>
//   //       Live Chat Widget
//   //     </Typography>
//   //     <Typography variant="body2" color="text.secondary">
//   //       The Tawk.to chat widget has been loaded.
//   //     </Typography>
//   //   </Box>
//   // ) :
// };

// export default TawkChatWidget;
// components/TawkChatWidget.tsx
"use client";
import { useEffect } from "react";
import { Box, Typography } from "@mui/material";

type TawkChatWidgetProps = {
  open: boolean;
  propertyId: string; // e.g., "680802d85a57ed19170a05a8"
  widgetId: string; // e.g., "1ipfkm7u8"
};

const TawkChatWidget: React.FC<TawkChatWidgetProps> = ({
  open,
  propertyId,
  widgetId,
}) => {
  useEffect(() => {
    if (!open || !propertyId || !widgetId) return;

    const scriptId = `tawk-script-${propertyId}-${widgetId}`;
    const existingScript = document.getElementById(scriptId);
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);

    return () => {
      // Optional cleanup (usually not necessary unless switching chats)
      // document.body.removeChild(script);
    };
  }, [open, propertyId, widgetId]);

  return null;
};

export default TawkChatWidget;
