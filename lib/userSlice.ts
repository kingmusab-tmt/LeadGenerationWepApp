import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  role?:
    | "seller"
    | "buyer"
    | "admin"
    | "staff"
    | "business-admin"
    | "user"
    | "guest"
    | string;
  mobile?: string;
  mobileNumber?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  companyDescription?: string;
  industryNiche?: string;
  businessAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postCode?: string;
  };
  isSubActive?: boolean;
  preferredDistribution?: "Automatic" | "Manual" | "Both" | string;
  tierUserType?: "seller" | "business";
}

interface UserState {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.loading = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.loading = false;
      state.error = null;
    },
    setUserLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUserError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setUser, updateUser, clearUser, setUserLoading, setUserError } =
  userSlice.actions;
export default userSlice.reducer;

// Selectors for type-safe state access
export const selectCurrentUser = (state: { user: UserState }) =>
  state.user.currentUser;
export const selectUserLoading = (state: { user: UserState }) =>
  state.user.loading;
export const selectUserError = (state: { user: UserState }) => state.user.error;
export const selectIsAuthenticated = (state: { user: UserState }) =>
  state.user.currentUser !== null;
export const selectUserRole = (state: { user: UserState }) =>
  state.user.currentUser?.role ?? "guest";
