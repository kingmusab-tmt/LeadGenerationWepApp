// app/store.ts
import {
  combineReducers,
  configureStore,
  type Reducer,
} from "@reduxjs/toolkit";
import userReducer from "@/lib/userSlice";
import uiReducer from "@/lib/uiSlice";

// Only user + ui slices are needed globally (auth state, notifications).
// Dashboard-heavy slices are injected lazily when their pages load.
export const store = configureStore({
  reducer: {
    user: userReducer,
    ui: uiReducer,
    // Placeholders — will be replaced by real reducers via injectDashboardReducers()
    formBuilder: (state = {}) => state,
    leads: (state = {}) => state,
    buyers: (state = {}) => state,
    campaigns: (state = {}) => state,
    analytics: (state = {}) => state,
  },
});

let dashboardReducersInjected = false;

/**
 * Call this once from any dashboard layout/page to swap in the real slices.
 * Subsequent calls are no-ops.
 */
export async function injectDashboardReducers() {
  if (dashboardReducersInjected) return;
  dashboardReducersInjected = true;

  const [
    { default: formBuilderReducer },
    { default: leadsReducer },
    { default: buyersReducer },
    { default: campaignsReducer },
    { default: analyticsReducer },
  ] = await Promise.all([
    import("@/lib/formBuilderSlice"),
    import("@/lib/leadsSlice"),
    import("@/lib/buyersSlice"),
    import("@/lib/campaignsSlice"),
    import("@/lib/analyticsSlice"),
  ]);

  store.replaceReducer(
    combineReducers({
      user: userReducer,
      ui: uiReducer,
      formBuilder: formBuilderReducer,
      leads: leadsReducer,
      buyers: buyersReducer,
      campaigns: campaignsReducer,
      analytics: analyticsReducer,
    }) as unknown as Reducer<ReturnType<typeof store.getState>>,
  );
}

// Define the RootState type — keep it matching the full shape so selectors work everywhere
export type RootState = {
  user: ReturnType<typeof userReducer>;
  ui: ReturnType<typeof uiReducer>;
  formBuilder: any;
  leads: any;
  buyers: any;
  campaigns: any;
  analytics: any;
};
export type AppDispatch = typeof store.dispatch;
