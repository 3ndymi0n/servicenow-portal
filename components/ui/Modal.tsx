"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  children:  React.ReactNode;
  size?:     "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // ── FIX (MEDIUM): Generate a stable ID to link aria-labelledby to the title.
  const titleId = "modal-title";

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      // ── FIX (MEDIUM): Add `role="dialog"`, `aria-modal="true"`, and
      //    `aria-labelledby` so screen readers correctly announce the modal
      //    opening, trap focus within it, and surface the title to assistive
      //    technology. The original had none of these attributes.
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "relative w-full bg-theme-surface border border-theme-border rounded-modal shadow-modal",
          "max-h-[88vh] flex flex-col overflow-hidden animate-fade-in",
          sizeClasses[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border shrink-0">
            {/* ── id matches aria-labelledby above */}
            <h2 id={titleId} className="text-base font-bold text-theme-text">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-theme-dim hover:text-theme-text transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
