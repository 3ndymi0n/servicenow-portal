"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppNotification } from "@/types";

const KEY = ["notifications"] as const;

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useMarkNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications/${id}/read`, { method: "POST" }).then((r) =>
        r.json(),
      ),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      qc.setQueryData<AppNotification[]>(KEY, (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
  });
}
