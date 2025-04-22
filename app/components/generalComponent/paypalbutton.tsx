import React, { useEffect, useState } from "react";
import axios from "axios";

const PayPalButton: React.FC = () => {
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the seller's PayPal Client ID from your backend
    const fetchPaypalClientId = async () => {
      try {
        const response = await axios.get("/api/get-paypal-client-id");
        if (response.data.success) {
          setPaypalClientId(response.data.clientId);
        } else {
          console.error("Failed to fetch PayPal Client ID");
        }
      } catch (error) {
        console.error("Error fetching PayPal Client ID:", error);
      }
    };

    fetchPaypalClientId();
  }, []);

  useEffect(() => {
    if (paypalClientId) {
      // Dynamically load the PayPal SDK with the seller's Client ID
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}`;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        // Clean up the script when the component unmounts
        document.body.removeChild(script);
      };
    }
  }, [paypalClientId]);

  return (
    <div>
      {paypalClientId ? (
        <div id="paypal-button-container"></div>
      ) : (
        <p>Loading PayPal...</p>
      )}
    </div>
  );
};

export default PayPalButton;
