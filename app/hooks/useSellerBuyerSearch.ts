"use client";

import { useEffect, useState } from "react";

export interface BuyerOption {
  id: string;
  name: string;
  company: string;
  email: string;
}

interface BuyerApiItem {
  _id: string;
  name: string;
  company: string;
  email: string;
}

/**
 * Typeahead search over the current seller's own buyers, for any picker
 * that needs to let a seller choose one of their buyers (e.g. manual
 * credit). Debounced and server-filtered against GET /api/buyers?search=,
 * rather than fetching the full list — the endpoint is paginated, so a
 * one-shot unfiltered fetch would silently miss buyers past the first page.
 */
export function useSellerBuyerSearch(query: string) {
  const [options, setOptions] = useState<BuyerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: "20" });
        if (query.trim()) params.set("search", query.trim());

        const response = await fetch(`/api/buyers?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch buyers");
        const result = await response.json();
        const buyersData: BuyerApiItem[] = Array.isArray(
          result?.data?.buyers,
        )
          ? result.data.buyers
          : [];

        if (cancelled) return;
        setOptions(
          buyersData.map((buyer) => ({
            id: buyer._id,
            name: buyer.name,
            company: buyer.company,
            email: buyer.email,
          })),
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load buyers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return { options, loading, error };
}
