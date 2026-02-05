// Notification hook for global notifications via Redux
// Provides simple interface for dispatching notifications from any component

"use client";

import { useAppDispatch } from "./useRedux";
import { addNotification } from "@/lib/uiSlice";

/**
 * Hook for displaying global notifications
 * Notifications automatically dismiss after 6 seconds
 * Uses Redux for centralized state management
 *
 * @returns Function to dispatch notifications
 * @param message - The notification message to display
 * @param severity - Notification type: success, error, warning, or info
 *
 * @example
 * const notify = useNotification();
 *
 * const handleSave = async () => {
 *   try {
 *     await api.save(data);
 *     notify("Saved successfully!", "success");
 *   } catch (error) {
 *     notify("Failed to save", "error");
 *   }
 * };
 */
export const useNotification = () => {
  const dispatch = useAppDispatch();

  return (
    message: string,
    severity: "success" | "error" | "warning" | "info" = "info",
  ) => {
    dispatch(addNotification({ message, severity }));
  };
};
