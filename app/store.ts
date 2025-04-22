// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import formBuilderReducer from "@/lib/formBuilderSlice";

export const store = configureStore({
  reducer: {
    formBuilder: formBuilderReducer,
  },
});

// Define the RootState type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
