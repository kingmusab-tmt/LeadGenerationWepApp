import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

interface Campaign {
  _id: string;
  name: string;
  type: "email" | "sms";
  status: "draft" | "scheduled" | "active" | "completed" | "paused";
  scheduledAt?: string;
  createdAt: string;
  stats?: CampaignStats;
}

interface CampaignsState {
  emailCampaigns: Campaign[];
  smsCampaigns: Campaign[];
  activeCampaign: Campaign | null;
  filters: {
    status: string;
    type: string;
  };
  loading: boolean;
  error: string | null;
}

const initialState: CampaignsState = {
  emailCampaigns: [],
  smsCampaigns: [],
  activeCampaign: null,
  filters: {
    status: "all",
    type: "all",
  },
  loading: false,
  error: null,
};

const campaignsSlice = createSlice({
  name: "campaigns",
  initialState,
  reducers: {
    setEmailCampaigns: (state, action: PayloadAction<Campaign[]>) => {
      state.emailCampaigns = action.payload;
      state.loading = false;
    },
    setSmsCampaigns: (state, action: PayloadAction<Campaign[]>) => {
      state.smsCampaigns = action.payload;
      state.loading = false;
    },
    addCampaign: (state, action: PayloadAction<Campaign>) => {
      if (action.payload.type === "email") {
        state.emailCampaigns.unshift(action.payload);
      } else {
        state.smsCampaigns.unshift(action.payload);
      }
    },
    updateCampaign: (
      state,
      action: PayloadAction<{ id: string; data: Partial<Campaign> }>,
    ) => {
      const updateInArray = (campaigns: Campaign[]) => {
        const index = campaigns.findIndex((c) => c._id === action.payload.id);
        if (index !== -1) {
          campaigns[index] = { ...campaigns[index], ...action.payload.data };
          return true;
        }
        return false;
      };

      if (!updateInArray(state.emailCampaigns)) {
        updateInArray(state.smsCampaigns);
      }

      if (state.activeCampaign?._id === action.payload.id) {
        state.activeCampaign = {
          ...state.activeCampaign,
          ...action.payload.data,
        };
      }
    },
    removeCampaign: (
      state,
      action: PayloadAction<{ id: string; type: "email" | "sms" }>,
    ) => {
      if (action.payload.type === "email") {
        state.emailCampaigns = state.emailCampaigns.filter(
          (c) => c._id !== action.payload.id,
        );
      } else {
        state.smsCampaigns = state.smsCampaigns.filter(
          (c) => c._id !== action.payload.id,
        );
      }

      if (state.activeCampaign?._id === action.payload.id) {
        state.activeCampaign = null;
      }
    },
    setActiveCampaign: (state, action: PayloadAction<Campaign | null>) => {
      state.activeCampaign = action.payload;
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<CampaignsState["filters"]>>,
    ) => {
      state.filters = { ...state.filters, ...action.payload };
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
  setEmailCampaigns,
  setSmsCampaigns,
  addCampaign,
  updateCampaign,
  removeCampaign,
  setActiveCampaign,
  setFilters,
  setLoading,
  setError,
} = campaignsSlice.actions;
export default campaignsSlice.reducer;

// Selectors for type-safe state access
export const selectEmailCampaigns = (state: { campaigns: CampaignsState }) =>
  state.campaigns.emailCampaigns;
export const selectSmsCampaigns = (state: { campaigns: CampaignsState }) =>
  state.campaigns.smsCampaigns;
export const selectActiveCampaign = (state: { campaigns: CampaignsState }) =>
  state.campaigns.activeCampaign;
export const selectCampaignsFilters = (state: { campaigns: CampaignsState }) =>
  state.campaigns.filters;
export const selectCampaignsLoading = (state: { campaigns: CampaignsState }) =>
  state.campaigns.loading;
export const selectCampaignsError = (state: { campaigns: CampaignsState }) =>
  state.campaigns.error;
export const selectCampaignById = (
  state: { campaigns: CampaignsState },
  id: string,
) =>
  [...state.campaigns.emailCampaigns, ...state.campaigns.smsCampaigns].find(
    (c) => c._id === id,
  ) ?? null;
