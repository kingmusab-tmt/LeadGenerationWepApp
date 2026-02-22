"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "@/lib/axiosInstance";

export interface SubscriptionLimits {
  // Core Limits
  forms?: number;
  leads?: number;
  buyers?: number;
  industries?: number;

  // Call Tracking
  callRecording?: boolean;
  callTranscription?: boolean;
  callAIAnalysis?: boolean;

  // Marketing & Campaigns
  emailCampaignsEnabled?: boolean;
  smsCampaignsEnabled?: boolean;
  smsCampaignsPerMonth?: number;

  // AI Features
  aiGenerativeEnabled?: boolean;
  chatbotEnabled?: boolean;
  leadScoringEnabled?: boolean;
  sentimentAnalysisEnabled?: boolean;
  aiSummariesEnabled?: boolean;

  // Integrations
  zapierIntegration?: boolean;
  webhookIntegration?: boolean;
  apiAccess?: boolean;

  // Data & Reporting
  exports?: boolean;
  imports?: boolean;
  advancedReports?: boolean;

  // Support
  liveSupport?: boolean;
  prioritySupport?: boolean;
}

interface UseSubscriptionLimitsReturn {
  limits: SubscriptionLimits | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and cache user's subscription limits
 * Automatically fetches once on mount and caches the result
 */
export function useSubscriptionLimits(): UseSubscriptionLimitsReturn {
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/users");
      const userData = response.data?.user;

      if (userData?.subscription?.subscriptionLimits) {
        setLimits(userData.subscription.subscriptionLimits);
      } else {
        // Default limits if not found
        setLimits({
          exports: false,
          imports: false,
          emailCampaignsEnabled: false,
          smsCampaignsEnabled: false,
          aiGenerativeEnabled: false,
        });
      }
    } catch (err) {
      console.error("Failed to fetch subscription limits:", err);
      setError("Failed to load subscription limits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchLimits();
    }
  }, [fetchLimits]);

  return {
    limits,
    loading,
    error,
    refresh: fetchLimits,
  };
}

export default useSubscriptionLimits;
