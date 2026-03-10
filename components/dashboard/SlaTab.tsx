"use client";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import type { AnalyticsData } from "@/types";
import { Card, SectionTitle }    from "@/components/ui/Card";
import { KpiCard }               from "@/components/ui/KpiCard";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import { ChartTooltip }          from "@/components/ui/ChartTooltip";
import { monthRatio }            from "@/lib/analytics/dateFilter";

interface Props { data:AnalyticsData; months:string[]; dataMonths:string[] }

const SlaBar = ({ met, size="md" }: { met:number; size?:"sm"|"md" }) => (
  <div className={`flex items-center gap-2 ${size==="sm"?"text-[10px]":"text-xs"}`}>
    <div className={`flex-1 rounded-full bg-theme-muted ${size==="sm"?"h-1.5":"h-2"}`}>
      <div className="h-full rounded-full transition-all"
        style={{ width:`${met}%`, background: met>=90?"#22c55e":met>=75?"#f59e0b":"#ef4444" }}/>
    </div>
    <span className="font-bold shrink-0" style={{ color: met>=90?"#22c55e":met>=75?"#f59e0b":"#ef4444" }}>{met}%</span>
  </div>
);

export function SlaTab({ data, months, dataMonths }: Props) {
  const ratio = monthRatio(months, dataMonths);
  const slaMet = data.dashboard.sla_met as number;

  const mthSla = useMemo(() =>
    (data.monthly_sla??[]).filter(r => months.includes(r.month as string)),
    [data, months]);

  const slaByPri = useMemo(() => data.sla_priority??[], [data]);
  const slaByCat = useMemo(() => (data.sla_category??[]).sort((a,b)=>(b["Met %"] as number)-(a["Met %"] as number)).slice(0,10), [data]);
  const slaByGrp = useMemo(() => (data.sla_group??[]).sort((a,b)=>(b["Met %"] as number)-(a["Met %"] as number)), [data]);

  const totMet    = useMemo(() => slaByPri.reduce((s,r)=>s+(r.Met as number),0), [slaByPri]);
  const totBreach = useMemo(() => slaByPri.reduce((s,r)=>s+(r.Breach as number),0), [slaByPri]);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Overall SLA Met"    value={`${slaMet}%`}
          color={slaMet>=90?"#22c55e":slaMet>=75?"#f59e0b":"#ef4444"}
          flag={slaMet<90?"bad":undefined}/>
        <KpiCard label="Total Met"     value={Math.round(totMet*ratio)}    color="#22c55e"/>
        <KpiCard label="Total Breached" value={Math.round(totBreach*ratio)} color="#ef4444" flag="bad"/>
        <KpiCard label="Breach Rate"   value={`${100-slaMet}%`}            color="#f59e0b"/>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* SLA trend */}
        <Card>
          <SectionTitle>SLA Met % — Monthly Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mthSla} margin={{ left:-10, right:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Line type="monotone" dataKey="SLA Met %" stroke="#22c55e" strokeWidth={2.5} dot={{ r:4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* SLA by priority */}
        <Card>
          <SectionTitle>SLA by Priority</SectionTitle>
          <div className="space-y-4 mt-2">
            {slaByPri.filter(p=>p.Total as number > 0).map((p,i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-theme-text">{p.priority as string}</span>
                  <span className="text-theme-dim">{Math.round((p.Met as number)*ratio)}/{Math.round((p.Total as number)*ratio)}</span>
                </div>
                <SlaBar met={p["Met %"] as number}/>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* By category */}
        <Card>
          <SectionTitle>SLA by Category</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={slaByCat} layout="vertical" margin={{ left:100, right:50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" horizontal={false}/>
              <XAxis type="number" domain={[0,100]} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" width={105} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="Met %" radius={[0,4,4,0]} fill="#3d6fd4"
                label={{ position:"right", fill:"#dce8ff", fontSize:10, formatter:(v:number)=>`${v}%`}}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* By group */}
        <Card>
          <SectionTitle>SLA by Resolver Group</SectionTitle>
          <div className="space-y-2.5">
            {slaByGrp.slice(0,8).map((g,i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-theme-text font-semibold">{g.assignment_group as string}</span>
                  <span className="text-theme-dim">{g.Total as number} tickets</span>
                </div>
                <SlaBar met={g["Met %"] as number} size="sm"/>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Full SLA table */}
      <Card>
        <SectionTitle>SLA Detail by Group</SectionTitle>
        <DataTable
          cols={[
            { key:"assignment_group", label:"Group",   bold:true },
            { key:"Total",            label:"Total",   right:true },
            { key:"Met",              label:"Met",     right:true },
            { key:"Met %",            label:"Met %",   right:true },
            { key:"Breach %",         label:"Breach %",right:true },
          ]}
          rows={slaByGrp as unknown as Record<string,unknown>[]}
          colorCell={(k,v) => {
            const n = v as number;
            if (k==="Met %")    return n>=90?"#22c55e":n>=75?"#f59e0b":"#ef4444";
            if (k==="Breach %") return n<=10?"#22c55e":n<=25?"#f59e0b":"#ef4444";
            return undefined;
          }}
        />
      </Card>
    </div>
  );
}
