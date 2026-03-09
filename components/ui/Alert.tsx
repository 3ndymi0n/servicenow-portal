import { cn } from "@/lib/utils";

type AlertType = "info" | "warn" | "error" | "success";

const styles: Record<AlertType, string> = {
  info:    "bg-info/10 border-info/40 text-info",
  warn:    "bg-warning/10 border-warning/40 text-warning",
  error:   "bg-danger/10 border-danger/40 text-danger",
  success: "bg-success/10 border-success/40 text-success",
};

const icons: Record<AlertType, string> = {
  info: "ℹ️", warn: "⚠️", error: "🚨", success: "✅",
};

export function Alert({ type = "info", children, className }: {
  type?: AlertType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 border rounded-md px-4 py-3 text-sm mb-4", styles[type], className)}>
      <span className="shrink-0 mt-0.5">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}
