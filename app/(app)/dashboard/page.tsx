"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/hooks/useCustomers";

export default function DashboardIndex() {
  const { data: customers = [], isLoading } = useCustomers();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && customers.length > 0) {
      router.replace(`/dashboard/${customers[0]!.id}`);
    }
  }, [customers, isLoading, router]);

  return (
    <div className="flex-1 flex items-center justify-center text-dark-dim animate-pulse p-10">
      Loading…
    </div>
  );
}
