import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: "solid" | "outline";
  className?: string;
}

export function Badge({ children, color, variant = "outline", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
        variant === "outline"
          ? "border border-current bg-transparent"
          : "text-white",
        className
      )}
      style={color ? { color, borderColor: color, backgroundColor: variant === "solid" ? color : `${color}22` } : undefined}
    >
      {children}
    </span>
  );
}
