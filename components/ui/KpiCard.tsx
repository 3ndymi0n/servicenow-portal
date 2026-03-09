import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  color?: string;
  icon?: string;
  flag?: "warn" | "bad";
  className?: string;
}

export function KpiCard({ label, value, sub, color = "#3d6fd4", icon, flag, className }: KpiCardProps) {
  return (
    <Card
      className={cn("relative", className)}
      style={{ borderLeft: `3px solid ${color}` } as React.CSSProperties}
    >
      {icon && <div className="text-lg mb-1.5">{icon}</div>}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-dark-dim mb-1.5">
        {label}
      </div>
      <div className="text-2xl font-extrabold leading-tight" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "text-xs mt-1",
            flag === "bad"  && "text-danger",
            flag === "warn" && "text-warning",
            !flag           && "text-dark-dim"
          )}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}
