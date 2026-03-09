"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/store/uiStore";
import { Badge } from "@/components/ui/Badge";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";

const ROLE_COLORS: Record<string, string> = {
  admin: "#f59e0b",
  analyst: "#3d6fd4",
  viewer: "#6b8fd4",
  employee: "#14b8a6",
};

export function TopNav() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const pathname = usePathname();
  const { theme, toggleTheme } = useUIStore();
  const { data: notifications = [] } = useNotifications();
  const unread = Array.isArray(notifications)
    ? notifications.filter((n) => !n.read).length
    : 0;

  if (!user) return null;

  const isEmployee = user.role === "employee";

  const navLinks = isEmployee
    ? [{ href: "/my-performance", label: "My Performance" }]
    : ([
        user.isExecutive || user.role === "admin"
          ? { href: "/executive", label: "Executive" }
          : null,
        { href: "/dashboard", label: "Dashboard" },
        user.isCustomerManager || user.role === "admin"
          ? { href: "/my-customers", label: "My Customers" }
          : null,
        user.role === "admin"
          ? { href: "/admin/users", label: "Admin Panel" }
          : null,
      ].filter(Boolean) as Array<{ href: string; label: string }>);

  return (
    <nav className="sticky top-0 z-40 h-[54px] flex items-center px-6 gap-6 bg-dark-surface border-b border-dark-border shadow-nav">
      {/* Brand */}
      <div className="font-extrabold text-sm text-dark-accent tracking-tight shrink-0">
        MSP Portal
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
              pathname.startsWith(link.href)
                ? "bg-dark-blue/20 text-dark-accent"
                : "text-dark-dim hover:text-dark-text hover:bg-dark-muted",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification bell */}
        {(user.role === "admin" || user.isCustomerManager) && (
          <Link
            href="/notifications"
            className="relative text-dark-dim hover:text-dark-text transition-colors"
          >
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger text-[9px] text-white font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="text-dark-dim hover:text-dark-text transition-colors text-base"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* User badge */}
        <Link href="/account" className="flex items-center gap-2 group">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: `${ROLE_COLORS[user.role] ?? "#3d6fd4"}22`,
              color: ROLE_COLORS[user.role],
            }}
          >
            {(user.displayName ?? user.username ?? "?")[0]!.toUpperCase()}
          </div>
          <span className="text-xs text-dark-dim group-hover:text-dark-text hidden sm:block">
            {user.displayName ?? user.username}
          </span>
        </Link>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-dark-dim hover:text-danger transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
