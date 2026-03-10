import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-card bg-theme-card border border-theme-border p-4 shadow-card",
        onClick && "cursor-pointer hover:-translate-y-0.5 transition-transform duration-100",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-theme-dim mb-3",
        className
      )}
    >
      {children}
    </h3>
  );
}
