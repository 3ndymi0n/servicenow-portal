import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";

const ADMIN_TABS = [
  { href:"/admin/users",          label:"👥 Users" },
  { href:"/admin/customers",      label:"🏢 Customers" },
  { href:"/admin/business-units", label:"🏗 Business Units" },
  { href:"/admin/upload",         label:"📤 Upload Data" },
  { href:"/admin/permissions",    label:"🔐 Permissions" },
  { href:"/admin/requests",       label:"📬 Access Requests" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex-1 flex flex-col">
      {/* Admin sub-nav */}
      <div className="flex gap-1 flex-wrap px-6 py-3 border-b border-dark-border bg-dark-surface">
        {ADMIN_TABS.map(t => (
          <Link key={t.href} href={t.href}
            className="px-3 py-1.5 rounded text-xs font-semibold text-dark-dim hover:text-dark-text hover:bg-dark-muted transition-colors border border-transparent hover:border-dark-border">
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}
