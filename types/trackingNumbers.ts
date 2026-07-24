export interface TrackingNumber {
  phoneNumber: string; // Tracking phone number
  industry: string; // Industry/niche
  forwardingType: string; // Forwarding type: "direct" | "single_multiple" | "specific_lead" | "multi_ring"
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
  overflowNumber?: string; // Overflow number when no buyers available (before voicemail)

  // Seller working hours
  enableWorkingHours?: boolean; // Only accept calls within specified hours
  workingHoursStart?: string; // Start time (HH:mm format, e.g. "09:00")
  workingHoursEnd?: string; // End time (HH:mm format, e.g. "17:00")

  // Recording consent
  recordingConsent?: boolean; // Play "this call may be recorded" before connecting
  recordingConsentMessage?: string; // Custom consent message

  // Missed call text-back
  missedCallTextBack?: boolean; // Auto-send SMS to caller on voicemail
  missedCallTextMessage?: string; // Custom text-back message

  // DNC & Spam
  dncEnabled?: boolean; // Enable Do-Not-Call list
  dncList?: string[]; // Blocked phone numbers
  spamFilterEnabled?: boolean; // Enable STIR/SHAKEN spam detection
  spamFilterAction?: "block" | "warn"; // What to do with spam calls (block or whisper warning)

  // Scheduled callbacks
  scheduledCallbackEnabled?: boolean; // Let callers request a callback
  scheduledCallbackDigit?: string; // Digit to press for callback (default "1")

  // Multi-ring
  multiRingEnabled?: boolean; // Ring all buyers simultaneously

  // Geo-routing
  geoRoutingEnabled?: boolean; // Route based on caller area code

  // Concurrent call handling
  concurrentCallLimit?: number; // Max simultaneous calls per buyer (0 = unlimited)

  // AI features
  transcriptionEnabled?: boolean; // Enable call transcription
  aiSummaryEnabled?: boolean; // Enable AI summary of calls

  forwardingNumbers?: string[]; // Forwarding numbers (for "single_multiple")
  leadBuyers?: {
    // Lead buyers (for "specific_lead")
    id: string;
    name: string;
    phone: string;
  }[];
}
