// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "@/lib/userSlice";
import uiReducer from "@/lib/uiSlice";

// formBuilder/leads/buyers/campaigns/analytics slices used to be injected
// lazily here for dashboard pages, but had zero real selectors/dispatches
// anywhere in the app — every dashboard screen manages its own state with
// local useState/useEffect instead. Removed rather than kept "in case",
// along with the dynamic-import injection machinery that existed only to
// wire them in.
export const store = configureStore({
  reducer: {
    user: userReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
