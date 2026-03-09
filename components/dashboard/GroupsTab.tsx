"use client";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import type { AnalyticsData, GroupStats } from "@/types";
import { Card, SectionTitle }    from "@/components/ui/Card";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import { ChartTooltip }          from "@/components/ui/ChartTooltip";
import { monthRatio }            from "@/lib/analytics/dateFilter";
import { scaleGroupRow }         from "@/lib/analytics/selectors";

const COLS: ColDef<GroupStats>[] = [
  { key:"Group",         label:"Group",      bold:true },
  { key:"Total",         label:"Tickets",    right:true },
  { key:"Incidents",     label:"Incidents",  right:true },
  { key:"Catalog Tasks", label:"Catalog",    right:true },
  { key:"Res Rate %",    label:"Res Rate",   right:true },
  { key:"Avg Res (hrs)", label:"Avg Res",    right:true },
  { key:"SLA Met %",     label:"SLA %",      right:true },
  { key:"SLA Breach %",  label:"Breach %",   right:true },
  { key:"Escalations",   label:"Escalations",right:true },
  { key:"Tickets/Tech",  label:"Tkts/Tech",  right:true },
];

interface Props { data:AnalyticsData; months:string[]; dataMonths:string[] }

export function GroupsTab({ data, months, dataMonths }: Props) {
  const ratio  = monthRatio(months, dataMonths);
  const scaled = useMemo(() => (data.groups ?? []).map(g => scaleGroupRow(g, ratio)), [data, ratio]);

  const slaGroup = useMemo(() => (data.sla_group ?? [])
    .filter(r => typeof r["Met %"] === "number")
    .sort((a,b)=> (b["Met %"] as number)-(a["Met %"] as number))
    .slice(0,8), [data]);

  const radarData = useMemo(() => scaled.slice(0,6).map(g => ({
    Group:           g.Group.replace(/ Team$/,"").replace(/ /g,"\n"),
    "SLA %":         g["SLA Met %"],
    "Res Rate %":    g["Res Rate %"],
    "Vol (norm)":    Math.min(100, Math.round((g.Total / (scaled[0]?.Total||1))*100)),
  })), [scaled]);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Ticket Volume by Group</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...scaled].sort((a,b)=>b.Total-a.Total).slice(0,8)} layout="vertical" margin={{ left:100, right:30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="Group" width={105} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Legend wrapperStyle={{ fontSize:11 }}/>
              <Bar dataKey="Incidents"     stackId="a" fill="#3d6fd4"/>
              <Bar dataKey="Catalog Tasks" stackId="a" fill="#14b8a6" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>SLA Met % by Group</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={slaGroup} layout="vertical" margin={{ left:100, right:50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" domain={[0,100]} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="assignment_group" width={105} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="Met %" radius={[0,4,4,0]} fill="#22c55e"
                label={{ position:"right", fill:"#dce8ff", fontSize:10, formatter:(v:number)=>`${v}%`}}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Group Radar (SLA / Resolution / Volume)</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
              <PolarGrid stroke="#142466"/>
              <PolarAngleAxis dataKey="Group" tick={{ fill:"#6b8fd4", fontSize:9 }}/>
              <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fill:"#6b8fd4", fontSize:8 }}/>
              <Radar name="SLA %"    dataKey="SLA %"     stroke="#22c55e" fill="#22c55e" fillOpacity={0.15}/>
              <Radar name="Res Rate" dataKey="Res Rate %" stroke="#3d6fd4" fill="#3d6fd4" fillOpacity={0.15}/>
              <Legend wrapperStyle={{ fontSize:11 }}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Tickets per Technician</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...scaled].sort((a,b)=>b["Tickets/Tech"]-a["Tickets/Tech"]).slice(0,8)} layout="vertical" margin={{ left:100, right:50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="Group" width={105} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="Tickets/Tech" radius={[0,4,4,0]} fill="#a855f7"
                label={{ position:"right", fill:"#dce8ff", fontSize:10, formatter:(v:number)=>`${v}`}}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionTitle>Full Group Table ({scaled.length} groups)</SectionTitle>
        <DataTable
          cols={COLS as ColDef<Record<string,unknown>>[]}
          rows={scaled as unknown as Record<string,unknown>[]}
          colorCell={(key,val) => {
            const v = val as number;
            if (key==="SLA Met %")    return v>=90?"#22c55e":v>=75?"#f59e0b":"#ef4444";
            if (key==="SLA Breach %") return v<=10?"#22c55e":v<=25?"#f59e0b":"#ef4444";
            return undefined;
          }}
        />
      </Card>
    </div>
  );
}
