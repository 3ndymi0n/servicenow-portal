"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@/types";

export const CUSTOMERS_KEY = ["customers"] as const;

async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch("/api/customers");
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export function useCustomers() {
  return useQuery({ queryKey: CUSTOMERS_KEY, queryFn: fetchCustomers });
}

export function useCustomerMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: Partial<Customer>) =>
      fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: Partial<Customer> & { id: string }) =>
      fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });

  return { create, update };
}
