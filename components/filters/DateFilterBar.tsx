"use client";
import { Select } from "@/components/ui/Select";

interface DateFilterBarProps {
  dateFrom:     string;
  dateTo:       string;
  setDateFrom:  (v: string) => void;
  setDateTo:    (v: string) => void;
  dataMonths:   string[];
  activeMonths: number;
}

export function DateFilterBar({
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  dataMonths,
  activeMonths,
}: DateFilterBarProps) {
  const monthOptions = dataMonths.map(m => ({ value: m, label: m }));

  // ── FIX (MEDIUM): Validate date range on change.
  //    Previously there was no guard, so selecting a From month later than To
  //    would pass an invalid range to resolveMonthsInRange, silently yielding
  //    zero months and blank charts with no user feedback.
  const handleFromChange = (v: string) => {
    setDateFrom(v);
    // If the new From is after the current To, advance To to match.
    if (v > dateTo) setDateTo(v);
  };

  const handleToChange = (v: string) => {
    setDateTo(v);
    // If the new To is before the current From, pull From back to match.
    if (v < dateFrom) setDateFrom(v);
  };

  const isInvalid = dateFrom > dateTo;

  return (
    <div className="flex items-center gap-4 mb-4 p-3 bg-theme-surface border border-theme-border rounded-card text-xs">
      <Select
        label="From"
        value={dateFrom}
        onChange={e => handleFromChange(e.target.value)}
        options={monthOptions}
        className="text-xs py-1"
      />
      <Select
        label="To"
        value={dateTo}
        onChange={e => handleToChange(e.target.value)}
        options={monthOptions}
        className="text-xs py-1"
      />
      {isInvalid && (
        <span className="text-xs text-danger font-semibold">
          ⚠ "From" must be before "To"
        </span>
      )}
      <div className="text-theme-dim ml-auto">
        <span className="font-semibold text-theme-accent">{activeMonths}</span>{" "}
        month{activeMonths !== 1 ? "s" : ""} selected
      </div>
    </div>
  );
}
