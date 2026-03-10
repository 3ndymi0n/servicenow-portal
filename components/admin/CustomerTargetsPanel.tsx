"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import type { CustomerConfig } from "@/types";

interface Props { customerId: string }

const NULL_CFG: CustomerConfig = {
  customerId: "",
  thresholds: { volume: null, sla: null, mttr: null, reopen: null, escl: null },
  benchmarks: {
    sla_target:    null,
    mttr_target:   null,
    reopen_target: null,
    escl_target:   null,
    fcr_target:    null,
  },
};

export function CustomerTargetsPanel({ customerId }: Props) {
  const qc = useQueryClient();
  const { data: cfg } = useQuery<CustomerConfig>({
    queryKey: ["customerConfig", customerId],
    queryFn:  () => fetch(`/api/customers/${customerId}/config`).then(r => r.json()),
  });

  const [thresholds, setT]  = useState(NULL_CFG.thresholds);
  const [benchmarks, setB]  = useState(NULL_CFG.benchmarks);
  const [saved,      setSaved]   = useState(false);
  // ── FIX (HIGH): Track save errors so users receive feedback on failure.
  //    The original code had no onError handler — failed saves silently
  //    returned to the idle state with no message.
  const [saveError,  setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (cfg) {
      setT({ ...NULL_CFG.thresholds, ...cfg.thresholds });
      setB({ ...NULL_CFG.benchmarks, ...cfg.benchmarks });
    }
  }, [cfg]);

  const save = useMutation({
    mutationFn: () =>
      fetch(`/api/customers/${customerId}/config`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ thresholds, benchmarks }),
      }).then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customerConfig", customerId] });
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: unknown) => {
      // Show a clear inline error message instead of silently failing.
      setSaveError(
        err instanceof Error
          ? `Save failed: ${err.message}`
          : "Save failed. Please try again.",
      );
    },
  });

  const numField = (
    label: string,
    val: number | null,
    set: (v: number | null) => void,
  ) => (
    <Input
      label={label}
      type="number"
      value={val ?? ""}
      placeholder="Not set"
      onChange={e => set(e.target.value ? Number(e.target.value) : null)}
    />
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-xs font-bold text-theme-dim uppercase tracking-wider mb-3">
          🚨 Alert Thresholds
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {numField("Volume Alert",    thresholds.volume,  v => setT(t => ({ ...t, volume:  v })))}
          {numField("SLA % Alert",     thresholds.sla,     v => setT(t => ({ ...t, sla:     v })))}
          {numField("MTTR Alert (h)",  thresholds.mttr,    v => setT(t => ({ ...t, mttr:    v })))}
          {numField("Reopen % Alert",  thresholds.reopen,  v => setT(t => ({ ...t, reopen:  v })))}
          {numField("Escalation Alert",thresholds.escl,    v => setT(t => ({ ...t, escl:    v })))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold text-theme-dim uppercase tracking-wider mb-3">
          🎯 Performance Targets
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {numField("SLA Target %",     benchmarks.sla_target,    v => setB(b => ({ ...b, sla_target:    v })))}
          {numField("MTTR Target (h)",  benchmarks.mttr_target,   v => setB(b => ({ ...b, mttr_target:   v })))}
          {numField("Max Reopen %",     benchmarks.reopen_target, v => setB(b => ({ ...b, reopen_target: v })))}
          {numField("Max Escalation %", benchmarks.escl_target,   v => setB(b => ({ ...b, escl_target:   v })))}
          {numField("FCR Target %",     benchmarks.fcr_target,    v => setB(b => ({ ...b, fcr_target:    v })))}
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-theme-border">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-4 py-2 text-xs font-semibold bg-theme-blue/20 text-theme-accent border border-theme-blue rounded hover:bg-theme-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {save.isPending ? "Saving…" : "Save Targets"}
        </button>
        {saved && (
          <span className="text-xs text-success">✓ Saved</span>
        )}
        {saveError && !save.isPending && (
          <span className="text-xs text-danger">{saveError}</span>
        )}
      </div>
    </div>
  );
}
