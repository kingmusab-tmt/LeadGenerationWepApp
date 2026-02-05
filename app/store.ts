// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import formBuilderReducer from "@/lib/formBuilderSlice";
import userReducer from "@/lib/userSlice";
import uiReducer from "@/lib/uiSlice";
import leadsReducer from "@/lib/leadsSlice";
import buyersReducer from "@/lib/buyersSlice";
import campaignsReducer from "@/lib/campaignsSlice";
import analyticsReducer from "@/lib/analyticsSlice";

export const store = configureStore({
  reducer: {
    formBuilder: formBuilderReducer,
    user: userReducer,
    ui: uiReducer,
    leads: leadsReducer,
    buyers: buyersReducer,
    campaigns: campaignsReducer,
    analytics: analyticsReducer,
  },
});

// Define the RootState type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
