"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import type { AnalyticsData } from "@/types";
import { Card, SectionTitle } from "@/components/ui/Card";
import { KpiCard }            from "@/components/ui/KpiCard";
import { ChartTooltip }       from "@/components/ui/ChartTooltip";
import { useForecast }        from "@/hooks/analytics/useForecast";
import { useQuery }           from "@tanstack/react-query";
import type { CustomerConfig } from "@/types";

type Metric = "volume"|"sla"|"mttr"|"reopen";
const METRIC_OPTS: { value:Metric; label:string }[] = [
  { value:"volume", label:"Volume" },
  { value:"sla",    label:"SLA Met %" },
  { value:"mttr",   label:"Avg Resolution" },
  { value:"reopen", label:"Reopen Rate" },
];

interface Props { data:AnalyticsData; months:string[]; customerId:string }

export function ForecastTab({ data, months, customerId }: Props) {
  const [metric,   setMetric]  = useState<Metric>("volume");
  const [horizon,  setHorizon] = useState(3);

  const { data:cfg } = useQuery<CustomerConfig>({
    queryKey: ["customerConfig", customerId],
    queryFn: () => fetch(`/api/customers/${customerId}/config`).then(r => r.json()),
  });

  const forecast = useForecast(data, months, metric, horizon);
  const anomalies = forecast.filter(p => p.isAnomaly && p.actual !== null);
  const futurePts = forecast.filter(p => p.actual === null);

  const THRESHOLDS: Record<Metric, { label:string; value:number|null }> = {
    volume: { label:"Volume alert",  value:cfg?.thresholds.volume ?? null },
    sla:    { label:"SLA threshold", value:cfg?.thresholds.sla    ?? null },
    mttr:   { label:"MTTR target",   value:cfg?.benchmarks?.mttr_target ?? null },
    reopen: { label:"Reopen threshold", value:cfg?.thresholds.reopen ?? null },
  };

  const threshold = THRESHOLDS[metric];

  return (
    <div className="animate-fade-in space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-dim">Metric:</span>
          {METRIC_OPTS.map(m => (
            <button key={m.value} onClick={() => setMetric(m.value)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${metric===m.value?"border-theme-blue text-theme-accent bg-theme-blue/20 font-bold":"border-theme-border text-theme-dim"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-dim">Horizon:</span>
          {[1,2,3,6].map(h => (
            <button key={h} onClick={() => setHorizon(h)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${horizon===h?"border-theme-blue text-theme-accent bg-theme-blue/20 font-bold":"border-theme-border text-theme-dim"}`}>
              {h}mo
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Anomalies Detected" value={anomalies.length}
          color={anomalies.length ? "#ef4444":"#22c55e"}
          flag={anomalies.length?"bad":undefined}/>
        <KpiCard label="Forecasted (next mo)"
          value={futurePts[0]?.forecast ?? "—"}
          color="#3d6fd4"/>
        <KpiCard label={threshold.label}
          value={threshold.value !== null ? String(threshold.value) : "Not set"}
          color={threshold.value ? "#f59e0b":"#6b8fd4"}/>
        <KpiCard label="Configured via"
          value="Admin → Customers"
          color="#6b8fd4"/>
      </div>

      {/* Forecast chart */}
      <Card>
        <SectionTitle>Forecast — {METRIC_OPTS.find(m=>m.value===metric)?.label} (linear regression + 95% CI)</SectionTitle>
        {forecast.length < 2
          ? <div className="py-10 text-center text-theme-dim text-sm">Not enough data to build a forecast.</div>
          : <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={forecast} margin={{ left:-5, right:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false}/>
                <XAxis dataKey="month" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Legend wrapperStyle={{ fontSize:11 }}/>
                <Area type="monotone" dataKey="upper" stroke="transparent" fill="#3d6fd411" name="Upper CI"/>
                <Area type="monotone" dataKey="lower" stroke="transparent" fill="rgb(var(--bg))"   name="Lower CI" fillOpacity={1}/>
                <Line type="monotone" dataKey="actual"   stroke="#5b9fff" strokeWidth={2.5} dot={(p) =>
                  p.payload.isAnomaly ? <circle key={p.key} cx={p.cx} cy={p.cy} r={6} fill="#ef4444" stroke="#ef4444"/> : <circle key={p.key} cx={p.cx} cy={p.cy} r={3} fill="#5b9fff"/>
                }/>
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Forecast"/>
                {threshold.value !== null && (
                  <ReferenceLine y={threshold.value} stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value:threshold.label, fill:"#ef4444", fontSize:10, position:"insideTopRight" }}/>
                )}
              </AreaChart>
            </ResponsiveContainer>
        }
      </Card>

      {/* Anomaly log */}
      {anomalies.length > 0 && (
        <Card>
          <SectionTitle>Anomaly Log</SectionTitle>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-theme-border text-theme-dim text-[10px] uppercase">
                <th className="text-left py-1 pr-4">Month</th>
                <th className="text-right py-1 px-2">Actual</th>
                <th className="text-right py-1 px-2">Forecast</th>
                <th className="text-right py-1 pl-2">Z-Score</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a,i) => (
                <tr key={i} className="border-b border-theme-border/20">
                  <td className="py-1 pr-4 font-bold text-theme-text">{a.month}</td>
                  <td className="py-1 px-2 text-right text-danger font-bold">{a.actual}</td>
                  <td className="py-1 px-2 text-right text-theme-dim">{a.forecast}</td>
                  <td className="py-1 pl-2 text-right text-warning font-bold">{a.zScore.toFixed(2)}σ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
