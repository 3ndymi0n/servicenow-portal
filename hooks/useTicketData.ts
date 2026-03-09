"use client";
import { useQuery } from "@tanstack/react-query";
import type { AnalyticsData } from "@/types";

export function ticketDataKey(customerId: string) {
  return ["ticketData", customerId] as const;
}

export function useTicketData(customerId: string | null) {
  return useQuery<AnalyticsData | null>({
    queryKey: customerId ? ticketDataKey(customerId) : ["ticketData", "none"],
    queryFn: async () => {
      if (!customerId) return null;
      const res = await fetch(`/api/customers/${customerId}/data`);
      if (!res.ok) throw new Error("Failed to fetch ticket data");
      return res.json();
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
