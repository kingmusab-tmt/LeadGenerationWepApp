"use client";
import { useEffect } from "react";

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
