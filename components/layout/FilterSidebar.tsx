"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";

export interface FilterItem {
  id:        string;
  label:     string;
  sublabel?: string;
}

export interface FilterSection {
  id:           string;
  label:        string;
  items:        FilterItem[];
  selected:     string[] | null;
  multiSelect:  boolean;
  hideAll?:     boolean;
  onChange:     (id: string, checked: boolean) => void;
  onSelectAll?: () => void;
}

interface FilterSidebarProps {
  sections: FilterSection[];
}

export function FilterSidebar({ sections }: FilterSidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(sections.map(s => s.id)),
  );

  // Auto-open sections that arrive after initial mount (e.g. after data loads)
  useEffect(() => {
    setOpenSections(prev => {
      const next = new Set(prev);
      let changed = false;
      sections.forEach(s => {
        if (!next.has(s.id)) {
          next.add(s.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.map(s => s.id).join(",")]);

  const toggleSection = (id: string) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <aside
      className={cn(
        "sticky top-[54px] h-[calc(100vh-54px)] shrink-0 overflow-hidden transition-all duration-200",
        "bg-theme-surface border-r border-theme-border flex flex-col",
        sidebarCollapsed ? "w-7" : "w-[220px]",
      )}
    >
      {/* ── FIX (LOW): Add `title` attribute so a tooltip appears on hover,
           giving users a clear affordance when the sidebar is collapsed.
           The aria-label was already correct; the tooltip reinforces it
           visually for mouse users who may miss the tiny chevron. */}
      <button
        onClick={toggleSidebar}
        title={sidebarCollapsed ? "Expand filters" : "Collapse filters"}
        aria-label={sidebarCollapsed ? "Expand filters" : "Collapse filters"}
        className="w-7 h-7 flex items-center justify-center text-theme-dim hover:text-theme-text transition-colors shrink-0 self-end mt-2"
      >
        {sidebarCollapsed ? "›" : "‹"}
      </button>

      {sidebarCollapsed ? (
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[10px] font-bold text-theme-dim tracking-widest uppercase"
            style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
          >
            FILTERS
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.length === 0 && (
            <div className="text-[10px] text-theme-dim text-center mt-6 uppercase tracking-widest">
              No filters
            </div>
          )}
          {sections.map(section => {
            const isOpen     = openSections.has(section.id);
            const allSelected = section.selected === null;
            const selectedSet = section.selected
              ? new Set(section.selected)
              : null;

            return (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-theme-dim hover:text-theme-text transition-colors"
                >
                  <span className="uppercase tracking-wider">{section.label}</span>
                  <span className={cn("transition-transform text-[10px]", isOpen && "rotate-180")}>
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {!section.hideAll && (
                      <label className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-theme-muted">
                        <input
                          type={section.multiSelect ? "checkbox" : "radio"}
                          checked={allSelected}
                          onChange={() => section.onSelectAll?.()}
                          className="accent-theme-blue"
                        />
                        <span
                          className={cn(
                            "text-xs",
                            allSelected
                              ? "text-theme-accent font-semibold"
                              : "text-theme-dim",
                          )}
                        >
                          All
                        </span>
                      </label>
                    )}

                    {section.items.map(item => {
                      const checked = allSelected
                        ? false
                        : (selectedSet?.has(item.id) ?? false);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-theme-muted"
                        >
                          <input
                            type={section.multiSelect ? "checkbox" : "radio"}
                            checked={checked}
                            onChange={e => section.onChange(item.id, e.target.checked)}
                            className="accent-theme-blue"
                          />
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "text-xs truncate",
                                checked
                                  ? "text-theme-accent font-semibold"
                                  : "text-theme-dim",
                              )}
                            >
                              {item.label}
                            </div>
                            {item.sublabel && (
                              <div className="text-[10px] text-theme-dim font-mono truncate">
                                {item.sublabel}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
