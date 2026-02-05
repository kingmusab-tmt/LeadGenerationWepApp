/**
 * Tracking Number Interface
 * Handles phone number tracking configuration
 */
export interface ITrackingNumber {
  phoneNumber: string; // Tracking phone number
  industry: string; // Industry/niche
  forwardingType: string; // Forwarding type
  method: "Manual" | "Automatic"; // Method of number acquisition
  recordCall: boolean; // Call recording toggle
  reconnectCaller: boolean; // Reconnect caller toggle
  passCallerId: boolean; // Pass caller ID toggle
  leadSource: string; // Source of the call
  welcomeMessage: string; // Welcome message
  callWhisper: string; // Call whisper message
  requireResponse: boolean; // Require response toggle
  buyerResponses?: {
    // Messages and digits for buyer verification
    message: string;
    digit: string;
  }[];
  leadResponses?: {
    // Messages and digits for lead verification
    message: string;
    digit: string;
  }[];
  forwardingNumbers?: string[]; // Forwarding numbers (for "single_multiple")
  leadBuyers?: {
    // Lead buyers (for "specific_lead")
    id: string;
    name: string;
    phone: string;
  }[];
}
