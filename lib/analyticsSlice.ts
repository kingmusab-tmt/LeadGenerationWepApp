import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AnalyticsData {
  totalLeads: number;
  totalRevenue: number;
  conversionRate: number;
  activeLeads: number;
  pendingLeads: number;
  soldLeads: number;
  rejectedLeads: number;
  chartData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }>;
  };
}

interface SubscriptionInfo {
  tier: string;
  status: string;
  expiryDate: string | null;
  limits: {
    leads: number;
    buyers: number;
    campaigns: number;
  };
  usage: {
    leads: number;
    buyers: number;
    campaigns: number;
  };
}

interface AnalyticsState {
  sellerOverview: AnalyticsData | null;
  buyerOverview: AnalyticsData | null;
  adminOverview: AnalyticsData | null;
  subscriptionInfo: SubscriptionInfo | null;
  timeframe: "daily" | "weekly" | "monthly";
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  sellerOverview: null,
  buyerOverview: null,
  adminOverview: null,
  subscriptionInfo: null,
  timeframe: "daily",
  loading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    setSellerOverview: (state, action: PayloadAction<AnalyticsData>) => {
      state.sellerOverview = action.payload;
      state.loading = false;
    },
    setBuyerOverview: (state, action: PayloadAction<AnalyticsData>) => {
      state.buyerOverview = action.payload;
      state.loading = false;
    },
    setAdminOverview: (state, action: PayloadAction<AnalyticsData>) => {
      state.adminOverview = action.payload;
      state.loading = false;
    },
    setSubscriptionInfo: (state, action: PayloadAction<SubscriptionInfo>) => {
      state.subscriptionInfo = action.payload;
    },
    updateSubscriptionUsage: (
      state,
      action: PayloadAction<Partial<SubscriptionInfo["usage"]>>,
    ) => {
      if (state.subscriptionInfo) {
        state.subscriptionInfo.usage = {
          ...state.subscriptionInfo.usage,
          ...action.payload,
        };
      }
    },
    setTimeframe: (
      state,
      action: PayloadAction<"daily" | "weekly" | "monthly">,
    ) => {
      state.timeframe = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setSellerOverview,
  setBuyerOverview,
  setAdminOverview,
  setSubscriptionInfo,
  updateSubscriptionUsage,
  setTimeframe,
  setLoading,
  setError,
} = analyticsSlice.actions;
export default analyticsSlice.reducer;

// Selectors for type-safe state access
export const selectSellerOverview = (state: { analytics: AnalyticsState }) =>
  state.analytics.sellerOverview;
export const selectBuyerOverview = (state: { analytics: AnalyticsState }) =>
  state.analytics.buyerOverview;
export const selectAdminOverview = (state: { analytics: AnalyticsState }) =>
  state.analytics.adminOverview;
export const selectSubscriptionInfo = (state: { analytics: AnalyticsState }) =>
  state.analytics.subscriptionInfo;
export const selectTimeframe = (state: { analytics: AnalyticsState }) =>
  state.analytics.timeframe;
export const selectAnalyticsLoading = (state: { analytics: AnalyticsState }) =>
  state.analytics.loading;
export const selectAnalyticsError = (state: { analytics: AnalyticsState }) =>
  state.analytics.error;
