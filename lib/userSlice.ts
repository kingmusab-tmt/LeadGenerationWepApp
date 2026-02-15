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
  username?: string;
  mobile?: string;
  mobileNumber?: string;
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
