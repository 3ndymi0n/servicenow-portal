import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TopNav } from "@/components/layout/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col">
      <TopNav />
      <main className="flex-1 flex">
        {children}
      </main>
    </div>
  );
}
