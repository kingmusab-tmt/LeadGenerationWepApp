export interface Buyer {
  name: string;
  company: string;
  walletUnit: number;
  email: string;
  phone: string;
  walletBalance: number;
  status: "new" | "active" | "inactive" | "suspended";
  preferredDistribution: "automatic" | "manual" | "direct";
  notificationPreferences: ("email" | "sms" | "dashboard")[];
  leadPreferences: {
    location: string;
    industry: string;
  };
  purchaseHistory: {
    leadId: string;
    date: Date;
    amount: number;
    unit: number;
  }[];
  paymentHistory: {
    date: Date;
    amount: number;
    method: string;
  }[];
  feedback: {
    rating: number;
    comment: string;
  }[];
}
