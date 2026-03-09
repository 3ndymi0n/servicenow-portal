"use client";
import { useQuery } from "@tanstack/react-query";
import type { BusinessUnit } from "@/types";

export function useBusinessUnits() {
  return useQuery<BusinessUnit[]>({
    queryKey: ["business-units"],
    queryFn: () => fetch("/api/business-units").then(r => r.json()),
  });
}
