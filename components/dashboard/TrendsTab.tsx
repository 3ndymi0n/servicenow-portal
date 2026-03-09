"use client";
import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { AnalyticsData } from "@/types";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ChartTooltip }       from "@/components/ui/ChartTooltip";

const CAT_COLORS = ["#3d6fd4","#14b8a6","#f59e0b","#ef4444","#a855f7","#22c55e","#e879f9","#f97316"];

interface Props { data:AnalyticsData; months:string[] }

export function TrendsTab({ data, months }: Props) {
  const catMonthly = useMemo(() =>
    (data.cat_monthly??[]).filter(r => months.includes(r.month as string)), [data, months]);
  const categories = useMemo(() => {
    if (!catMonthly.length) return [];
    return Object.keys(catMonthly[0]!).filter(k => k !== "month");
  }, [catMonthly]);

  const slaMonthly = useMemo(() =>
    (data.monthly_sla??[]).filter(r => months.includes(r.month as string)), [data, months]);

  const catState = useMemo(() => data.cat_state ?? [], [data]);
  const catType  = useMemo(() => data.cat_type  ?? [], [data]);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Incident Category Trends</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={catMonthly} margin={{ left:-5, right:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Legend wrapperStyle={{ fontSize:10 }}/>
              {categories.map((cat,i) => (
                <Line key={cat} type="monotone" dataKey={cat}
                  stroke={CAT_COLORS[i%CAT_COLORS.length]} strokeWidth={2} dot={false}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Monthly SLA Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={slaMonthly} margin={{ left:-5, right:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Line type="monotone" dataKey="SLA Met %" stroke="#22c55e" strokeWidth={2.5} dot={{ r:4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Category by State</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catState.slice(0,8)} layout="vertical" margin={{ left:100, right:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" width={105} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Legend wrapperStyle={{ fontSize:11 }}/>
              <Bar dataKey="Closed"      stackId="a" fill="#22c55e"/>
              <Bar dataKey="In Progress" stackId="a" fill="#3d6fd4"/>
              <Bar dataKey="On Hold"     stackId="a" fill="#f59e0b" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Category by Type</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catType.slice(0,8)} layout="vertical" margin={{ left:100, right:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" width={105} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Legend wrapperStyle={{ fontSize:11 }}/>
              <Bar dataKey="Incidents"     stackId="a" fill="#3d6fd4"/>
              <Bar dataKey="Catalog Tasks" stackId="a" fill="#14b8a6" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
