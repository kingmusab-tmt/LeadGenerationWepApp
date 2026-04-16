// User state and initialization hook
// Centralizes user authentication state management with automatic fetch-once pattern

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import axios from "axios";
import {
  clearUser,
  setUser,
  setUserError,
  setUserLoading,
  User,
} from "@/lib/userSlice";

/**
 * Shape of user data returned from various API endpoints
 * Handles multiple naming conventions
 */
interface UserApiResponse {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    uid?: string;
    name?: string;
    fullName?: string;
    email?: string;
    mail?: string;
    image?: string;
    avatar?: string;
    role?: string;
    userRole?: string;
    mobile?: string;
    phone?: string;
    mobileNumber?: string;
    businessName?: string;
    businessEmail?: string;
    businessPhone?: string;
    businessWebsite?: string;
    companyDescription?: string;
    industryNiche?: string;
    businessAddress?: Record<string, unknown>;
    isSubActive?: boolean;
    isSubscriptionActive?: boolean;
  };
  id?: string;
  _id?: string;
  userId?: string;
  uid?: string;
  name?: string;
  fullName?: string;
  email?: string;
  mail?: string;
  image?: string;
  avatar?: string;
  role?: string;
  userRole?: string;
  mobile?: string;
  phone?: string;
  mobileNumber?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  companyDescription?: string;
  industryNiche?: string;
  businessAddress?: Record<string, unknown>;
  isSubActive?: boolean;
  isSubscriptionActive?: boolean;
}

/**
 * Normalizes various API response formats into consistent User object
 * Handles multiple naming conventions from different API endpoints
 * @param data Raw API response data
 * @returns Normalized User object
 */
export const normalizeUser = (
  data: UserApiResponse | null | undefined,
): User => {
  const raw = data?.user ?? data;
  if (!raw) {
    return {};
  }

  return {
    id: raw.id ?? raw._id ?? raw.userId ?? raw.uid ?? undefined,
    name: raw.name ?? raw.fullName ?? undefined,
    email: raw.email ?? raw.mail ?? undefined,
    image: raw.image ?? raw.avatar ?? undefined,
    role: raw.role ?? raw.userRole ?? "user",
    mobile: raw.mobile ?? raw.phone ?? raw.mobileNumber ?? undefined,
    mobileNumber: raw.mobileNumber ?? raw.phone ?? raw.mobile ?? undefined,
    businessName: raw.businessName ?? undefined,
    businessEmail: raw.businessEmail ?? undefined,
    businessPhone: raw.businessPhone ?? undefined,
    businessWebsite: raw.businessWebsite ?? undefined,
    companyDescription: raw.companyDescription ?? undefined,
    industryNiche: raw.industryNiche ?? undefined,
    businessAddress: raw.businessAddress ?? undefined,
    isSubActive: raw.isSubActive ?? raw.isSubscriptionActive ?? undefined,
  };
};

/**
 * Hook for initializing and managing user state
 * Automatically fetches user data once on mount
 * Prevents duplicate API calls using useRef pattern
 *
 * @returns Object containing:
 *   - currentUser: Current logged-in user or null
 *   - loading: Whether user is being fetched
 *   - error: Error message if fetch failed
 *   - refreshUser: Function to manually refresh user (force=true to bypass cache)
 *
 * @example
 * const { currentUser, loading, refreshUser } = useInitializeUser();
 *
 * if (loading) return <LoadingComponent />;
 * if (!currentUser) redirect("/auth/sign-in");
 *
 * const handleSave = async () => {
 *   // Save user data
 *   await refreshUser(true); // Force refresh after save
 * };
 */
export const useInitializeUser = () => {
  const dispatch = useAppDispatch();
  const userState = useAppSelector((state) => state.user);
  const { status: sessionStatus } = useSession();
  const hasAttemptedRef = useRef(false);

  const fetchUser = useCallback(
    async (force = false): Promise<User | null> => {
      if (userState.loading && !force) {
        return null;
      }

      if (hasAttemptedRef.current && !force && userState.currentUser) {
        return userState.currentUser;
      }

      hasAttemptedRef.current = true;
      dispatch(setUserLoading(true));

      try {
        const response = await axios.get(
          "/api/users",
          force
            ? {
                params: { _t: Date.now() },
                headers: {
                  "Cache-Control": "no-cache",
                  Pragma: "no-cache",
                },
              }
            : undefined,
        );
        const normalized = normalizeUser(response.data);
        dispatch(setUser(normalized));
        return normalized;
      } catch (error) {
        dispatch(setUserError("Failed to load user"));
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          dispatch(clearUser());
        }
        return null;
      }
    },
    [dispatch, userState.loading, userState.currentUser],
  );

  // Only fetch user data when session is authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      // Clear stale user data for logged-out visitors — skip network call
      if (userState.currentUser) {
        dispatch(clearUser());
      }
      hasAttemptedRef.current = false;
      return;
    }

    if (
      sessionStatus === "authenticated" &&
      !userState.currentUser &&
      !userState.loading &&
      !hasAttemptedRef.current
    ) {
      fetchUser();
    }
  }, [
    sessionStatus,
    userState.currentUser,
    userState.loading,
    fetchUser,
    dispatch,
  ]);

  return { ...userState, refreshUser: fetchUser };
};
