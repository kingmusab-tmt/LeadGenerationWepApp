import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Buyer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  walletUnit: number;
  leadPreferences: {
    location: string;
    industry: string;
  };
}

interface BuyersState {
  buyers: Buyer[];
  selectedBuyers: string[];
  filters: {
    status: string;
    location: string;
    industry: string;
  };
  pagination: {
    page: number;
    rowsPerPage: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: BuyersState = {
  buyers: [],
  selectedBuyers: [],
  filters: {
    status: "all",
    location: "all",
    industry: "all",
  },
  pagination: {
    page: 0,
    rowsPerPage: 10,
    total: 0,
  },
  loading: false,
  error: null,
};

const buyersSlice = createSlice({
  name: "buyers",
  initialState,
  reducers: {
    setBuyers: (state, action: PayloadAction<Buyer[]>) => {
      state.buyers = action.payload;
      state.loading = false;
    },
    addBuyer: (state, action: PayloadAction<Buyer>) => {
      state.buyers.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateBuyer: (
      state,
      action: PayloadAction<{ id: string; data: Partial<Buyer> }>,
    ) => {
      const index = state.buyers.findIndex((b) => b._id === action.payload.id);
      if (index !== -1) {
        state.buyers[index] = {
          ...state.buyers[index],
          ...action.payload.data,
        };
      }
    },
    removeBuyer: (state, action: PayloadAction<string>) => {
      state.buyers = state.buyers.filter((b) => b._id !== action.payload);
      state.pagination.total -= 1;
    },
    setSelectedBuyers: (state, action: PayloadAction<string[]>) => {
      state.selectedBuyers = action.payload;
    },
    toggleBuyerSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedBuyers.indexOf(action.payload);
      if (index > -1) {
        state.selectedBuyers.splice(index, 1);
      } else {
        state.selectedBuyers.push(action.payload);
      }
    },
    clearSelectedBuyers: (state) => {
      state.selectedBuyers = [];
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<BuyersState["filters"]>>,
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (
      state,
      action: PayloadAction<Partial<BuyersState["pagination"]>>,
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
  setBuyers,
  addBuyer,
  updateBuyer,
  removeBuyer,
  setSelectedBuyers,
  toggleBuyerSelection,
  clearSelectedBuyers,
  setFilters,
  setPagination,
  setLoading,
  setError,
} = buyersSlice.actions;
export default buyersSlice.reducer;

// Selectors for type-safe state access
export const selectBuyers = (state: { buyers: BuyersState }) =>
  state.buyers.buyers;
export const selectSelectedBuyers = (state: { buyers: BuyersState }) =>
  state.buyers.selectedBuyers;
export const selectBuyersFilters = (state: { buyers: BuyersState }) =>
  state.buyers.filters;
export const selectBuyersPagination = (state: { buyers: BuyersState }) =>
  state.buyers.pagination;
export const selectBuyersLoading = (state: { buyers: BuyersState }) =>
  state.buyers.loading;
export const selectBuyersError = (state: { buyers: BuyersState }) =>
  state.buyers.error;
export const selectBuyerById = (state: { buyers: BuyersState }, id: string) =>
  state.buyers.buyers.find((b) => b._id === id) ?? null;
