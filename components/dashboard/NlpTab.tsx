"use client";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import type { AnalyticsData } from "@/types";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ChartTooltip }       from "@/components/ui/ChartTooltip";
import { useNlpAnalysis }     from "@/hooks/analytics/useNlpAnalysis";

const COLORS = ["#3d6fd4","#14b8a6","#f59e0b","#a855f7","#ef4444","#22c55e","#e879f9","#f97316","#38bdf8","#c084fc"];

interface Props { data:AnalyticsData; months:string[] }

export function NlpTab({ data, months }: Props) {
  const nlp = useNlpAnalysis(data, months);

  if (!nlp) return (
    <div className="py-20 text-center text-dark-dim text-sm">No text data available for analysis.</div>
  );

  return (
    <div className="animate-fade-in space-y-4">
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${nlp.hasText?"bg-green-400":"bg-yellow-400"}`}/>
        <span className="text-xs text-dark-dim">
          {nlp.hasText
            ? <><b className="text-dark-accent">{nlp.totalAnalysed.toLocaleString()}</b> records analysed · Live NLP</>
            : "Estimated data · no text fields in upload"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top keywords */}
        <Card>
          <SectionTitle>Top Keywords in Tickets</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={nlp.top_keywords.slice(0,12)} layout="vertical" margin={{ left:70, right:30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="word" width={75} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="count" fill="#3d6fd4" radius={[0,3,3,0]} name="Occurrences"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Root cause distribution */}
        <Card>
          <SectionTitle>Root Cause Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={nlp.rc_counts.slice(0,8)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name.split("/")[0]?.trim()} ${Math.round((percent??0)*100)}%`} labelLine={false}>
                {nlp.rc_counts.slice(0,8).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Error signal counts */}
        <Card>
          <SectionTitle>Error Signal Frequency</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={nlp.error_counts.filter(e=>e.count>0).sort((a,b)=>b.count-a.count).slice(0,10)} layout="vertical" margin={{ left:80, right:30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="term" width={85} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="count" fill="#ef4444" radius={[0,3,3,0]} name="Occurrences"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Resolution actions */}
        <Card>
          <SectionTitle>Resolution Action Frequency</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={nlp.res_counts.filter(r=>r.count>0).sort((a,b)=>b.count-a.count).slice(0,10)} layout="vertical" margin={{ left:90, right:30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142466" horizontal={false}/>
              <XAxis type="number" tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="action" width={95} tick={{ fill:"#6b8fd4", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="count" fill="#22c55e" radius={[0,3,3,0]} name="Occurrences"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Phase + Sentiment */}
      {(nlp.phase_dist.length > 0 || nlp.sentiment_dist.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {nlp.phase_dist.length > 0 && (
            <Card>
              <SectionTitle>Ticket Phase Distribution</SectionTitle>
              <div className="flex flex-wrap gap-2 mt-1">
                {nlp.phase_dist.map(p => (
                  <div key={p.phase} className="flex items-center gap-2 bg-dark-surface border border-dark-border rounded px-3 py-1.5 text-xs">
                    <span className="font-semibold text-dark-text">{p.phase}</span>
                    <span className="text-dark-accent font-bold">{p.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {nlp.sentiment_dist.length > 0 && (
            <Card>
              <SectionTitle>Sentiment Distribution</SectionTitle>
              <div className="flex flex-wrap gap-2 mt-1">
                {nlp.sentiment_dist.map(s => {
                  const color = s.sentiment==="Positive"?"#22c55e":s.sentiment==="Frustrated"?"#ef4444":"#f59e0b";
                  return (
                    <div key={s.sentiment} className="flex items-center gap-2 bg-dark-surface border rounded px-3 py-1.5 text-xs" style={{ borderColor:`${color}44` }}>
                      <span className="font-semibold" style={{ color }}>{s.sentiment}</span>
                      <span className="text-dark-dim">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Repeat issues */}
      {nlp.repeat_issues.length > 0 && (
        <Card>
          <SectionTitle>Repeat Issue Patterns (3+ occurrences)</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {nlp.repeat_issues.slice(0,12).map((r,i) => (
              <div key={i} className="bg-dark-surface border border-dark-border rounded p-2.5 text-xs">
                <div className="font-bold text-dark-text mb-0.5">{r.caller_id}</div>
                <div className="text-dark-dim">{r.subcategory}</div>
                <div className="text-dark-accent font-bold mt-1">{r.count}× reported</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
