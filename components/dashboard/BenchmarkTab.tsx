"use client";
import type { AnalyticsData, CustomerConfig } from "@/types";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useQuery }           from "@tanstack/react-query";

const METRICS = [
  { key:"sla_target",    label:"SLA Target %",    dataKey:"sla_met" },
  { key:"mttr_target",   label:"MTTR Target (hrs)",dataKey:"mttr" },
  { key:"reopen_target", label:"Max Reopen %",     dataKey:"reopen_rate" },
  { key:"escl_target",   label:"Max Escalation %", dataKey:null },
  { key:"fcr_target",    label:"FCR Target %",     dataKey:null },
] as const;

function Rag({ status }: { status:"green"|"amber"|"red" }) {
  const color = { green:"#22c55e", amber:"#f59e0b", red:"#ef4444" }[status];
  return <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background:color }}/>;
}

interface Props { data:AnalyticsData; months:string[]; customerId:string; allCustomers:Array<{id:string;name:string}> }

export function BenchmarkTab({ data, months, customerId, allCustomers }: Props) {
  const { data:cfg } = useQuery<CustomerConfig>({
    queryKey: ["customerConfig", customerId],
    queryFn:  () => fetch(`/api/customers/${customerId}/config`).then(r=>r.json()),
  });

  const benchmarks = cfg?.benchmarks;
  const dash       = data.dashboard;

  const getStatus = (metricKey: string, target: number|null, actual: number): "green"|"amber"|"red" => {
    if (target === null) return "amber";
    if (metricKey.includes("max") || metricKey.includes("reopen") || metricKey.includes("mttr")) {
      return actual <= target ? "green" : actual <= target*1.2 ? "amber" : "red";
    }
    return actual >= target ? "green" : actual >= target*0.9 ? "amber" : "red";
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Benchmark targets */}
      <Card>
        <SectionTitle>Performance Targets vs Actuals</SectionTitle>
        {!benchmarks
          ? <div className="text-xs text-dark-dim py-4">No targets configured. Set targets in Admin → Customers → 🎯 Targets.</div>
          : <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-border text-dark-dim text-[10px] uppercase">
                  <th className="text-left py-1.5 pr-4">Metric</th>
                  <th className="text-right py-1.5 px-3">Target</th>
                  <th className="text-right py-1.5 px-3">Current</th>
                  <th className="text-center py-1.5 pl-3">RAG</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map(m => {
                  const target = benchmarks[m.key] as number|null;
                  const actual = m.dataKey ? (dash as Record<string,number>)[m.dataKey] ?? 0 : null;
                  const status = actual !== null ? getStatus(m.key, target, actual) : "amber";
                  return (
                    <tr key={m.key} className="border-b border-dark-border/20">
                      <td className="py-2 pr-4 font-semibold text-dark-text">{m.label}</td>
                      <td className="py-2 px-3 text-right text-dark-dim">
                        {target !== null ? target : <span className="italic">Not set</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-dark-text">
                        {actual !== null ? actual : "—"}
                      </td>
                      <td className="py-2 pl-3 text-center flex justify-center">
                        <Rag status={status}/>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        }
      </Card>

      {/* SLA table by group for comparison */}
      <Card>
        <SectionTitle>Resolver Group SLA vs Target</SectionTitle>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dark-border text-dark-dim text-[10px] uppercase">
              <th className="text-left py-1.5">Group</th>
              <th className="text-right py-1.5 px-3">SLA Met %</th>
              <th className="text-right py-1.5 px-3">Target</th>
              <th className="text-center py-1.5">RAG</th>
            </tr>
          </thead>
          <tbody>
            {(data.sla_group ?? []).map((g,i) => {
              const met    = g["Met %"] as number;
              const target = benchmarks?.sla_target ?? null;
              const status = target ? (met >= target ? "green" : met >= target*0.9 ? "amber" : "red") : "amber";
              return (
                <tr key={i} className="border-b border-dark-border/20">
                  <td className="py-1.5 font-semibold text-dark-text">{g.assignment_group as string}</td>
                  <td className="py-1.5 px-3 text-right" style={{ color: met>=90?"#22c55e":met>=75?"#f59e0b":"#ef4444" }}>
                    <b>{met}%</b>
                  </td>
                  <td className="py-1.5 px-3 text-right text-dark-dim">{target ?? "—"}</td>
                  <td className="py-1.5 flex justify-center"><Rag status={status}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
