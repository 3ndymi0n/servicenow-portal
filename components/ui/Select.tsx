import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string;
  options:  Array<{ value: string; label: string }>;
  error?:   string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-theme-dim uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        {/*
          ── FIX (MEDIUM): The original component used `appearance-none` to
             strip the browser's native dropdown arrow but provided no custom
             replacement, making the element visually indistinguishable from a
             plain text input. The fix wraps the select in a relative container
             and overlays a custom SVG chevron so users can see it is interactive.
        */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full bg-theme-surface border border-theme-border rounded-md px-3 py-2 pr-8 text-sm text-theme-text",
              "focus:outline-none focus:border-theme-blue transition-colors appearance-none cursor-pointer",
              error && "border-danger",
              className,
            )}
            {...props}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-theme-surface">
                {opt.label}
              </option>
            ))}
          </select>
          {/* Custom chevron — pointer-events-none so clicks pass through to select */}
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-theme-dim">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
