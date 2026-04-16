import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Lead } from "@/types/lead";

interface LeadsState {
  leads: Lead[];
  selectedLeads: string[];
  filters: {
    status: string;
    source: string;
    dateRange: {
      start: string | null;
      end: string | null;
    };
  };
  pagination: {
    page: number;
    rowsPerPage: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: LeadsState = {
  leads: [],
  selectedLeads: [],
  filters: {
    status: "all",
    source: "all",
    dateRange: {
      start: null,
      end: null,
    },
  },
  pagination: {
    page: 0,
    rowsPerPage: 10,
    total: 0,
  },
  loading: false,
  error: null,
};

const leadsSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {
    setLeads: (state, action: PayloadAction<Lead[]>) => {
      state.leads = action.payload;
      state.loading = false;
    },
    addLead: (state, action: PayloadAction<Lead>) => {
      state.leads.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateLead: (
      state,
      action: PayloadAction<{ id: string; data: Partial<Lead> }>,
    ) => {
      const index = state.leads.findIndex((l) => l._id === action.payload.id);
      if (index !== -1) {
        state.leads[index] = { ...state.leads[index], ...action.payload.data };
      }
    },
    removeLead: (state, action: PayloadAction<string>) => {
      state.leads = state.leads.filter((l) => l._id !== action.payload);
      state.pagination.total -= 1;
    },
    setSelectedLeads: (state, action: PayloadAction<string[]>) => {
      state.selectedLeads = action.payload;
    },
    toggleLeadSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedLeads.indexOf(action.payload);
      if (index > -1) {
        state.selectedLeads.splice(index, 1);
      } else {
        state.selectedLeads.push(action.payload);
      }
    },
    clearSelectedLeads: (state) => {
      state.selectedLeads = [];
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<LeadsState["filters"]>>,
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (
      state,
      action: PayloadAction<Partial<LeadsState["pagination"]>>,
    ) => {
      state.pagination = { ...state.pagination, ...action.payload };
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
  setLeads,
  addLead,
  updateLead,
  removeLead,
  setSelectedLeads,
  toggleLeadSelection,
  clearSelectedLeads,
  setFilters,
  setPagination,
  setLoading,
  setError,
} = leadsSlice.actions;
export default leadsSlice.reducer;

// Selectors for type-safe state access
export const selectLeads = (state: { leads: LeadsState }) => state.leads.leads;
export const selectSelectedLeads = (state: { leads: LeadsState }) =>
  state.leads.selectedLeads;
export const selectLeadsFilters = (state: { leads: LeadsState }) =>
  state.leads.filters;
export const selectLeadsPagination = (state: { leads: LeadsState }) =>
  state.leads.pagination;
export const selectLeadsLoading = (state: { leads: LeadsState }) =>
  state.leads.loading;
export const selectLeadsError = (state: { leads: LeadsState }) =>
  state.leads.error;
export const selectLeadById = (state: { leads: LeadsState }, id: string) =>
  state.leads.leads.find((l) => l._id === id) ?? null;
