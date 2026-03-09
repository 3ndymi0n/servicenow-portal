"use client";
import { Select } from "@/components/ui/Select";

interface DateFilterBarProps {
  dateFrom:    string;
  dateTo:      string;
  setDateFrom: (v: string) => void;
  setDateTo:   (v: string) => void;
  dataMonths:  string[];
  activeMonths:number;
}

export function DateFilterBar({ dateFrom, dateTo, setDateFrom, setDateTo, dataMonths, activeMonths }: DateFilterBarProps) {
  const monthOptions = dataMonths.map(m => ({ value: m, label: m }));

  return (
    <div className="flex items-center gap-4 mb-4 p-3 bg-dark-surface border border-dark-border rounded-card text-xs">
      <Select
        label="From"
        value={dateFrom}
        onChange={e => setDateFrom(e.target.value)}
        options={monthOptions}
        className="text-xs py-1"
      />
      <Select
        label="To"
        value={dateTo}
        onChange={e => setDateTo(e.target.value)}
        options={monthOptions}
        className="text-xs py-1"
      />
      <div className="text-dark-dim ml-auto">
        <span className="font-semibold text-dark-accent">{activeMonths}</span> month{activeMonths !== 1 ? "s" : ""} selected
      </div>
    </div>
  );
}
