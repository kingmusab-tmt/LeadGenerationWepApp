import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Notification {
  id: string;
  message: string;
  severity: "success" | "error" | "warning" | "info";
  timestamp: number;
}

interface UIState {
  notifications: Notification[];
  sidebarOpen: boolean;
  theme: "light" | "dark";
  loading: {
    [key: string]: boolean;
  };
}

const initialState: UIState = {
  notifications: [],
  sidebarOpen: true,
  theme: "light",
  loading: {},
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, "id" | "timestamp">>,
    ) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload,
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    setLoading: (
      state,
      action: PayloadAction<{ key: string; value: boolean }>,
    ) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loading[action.payload];
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  toggleTheme,
  setLoading,
  clearLoading,
} = uiSlice.actions;
export default uiSlice.reducer;
