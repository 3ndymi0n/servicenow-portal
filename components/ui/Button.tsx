import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  fullWidth?:boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   "bg-dark-blue text-white hover:bg-dark-accent disabled:opacity-50",
  secondary: "bg-dark-muted text-dark-text hover:bg-dark-border",
  danger:    "bg-danger text-white hover:opacity-90",
  ghost:     "bg-transparent text-dark-dim hover:text-dark-text hover:bg-dark-muted",
  outline:   "bg-transparent border border-dark-border text-dark-dim hover:border-dark-blue hover:text-dark-blue",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded",
  md: "px-4 py-2 text-sm rounded-md",
  lg: "px-6 py-3 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "font-sans font-medium transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-dark-accent",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        (disabled || loading) && "cursor-not-allowed",
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
);
Button.displayName = "Button";
