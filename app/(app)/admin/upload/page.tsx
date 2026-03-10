"use client";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button }  from "@/components/ui/Button";
import { Select }  from "@/components/ui/Select";
import { Alert }   from "@/components/ui/Alert";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import type { Customer } from "@/types";
import type { DeduplicateStats } from "@/lib/analytics/deduplicate";

type DedupDetails = { added:any[]; updated:any[]; skipped:any[]; noDate:any[] };

export default function UploadPage() {
  const qc = useQueryClient();
  const { data:customers=[] } = useQuery<Customer[]>({ queryKey:["customers"], queryFn:()=>fetch("/api/customers").then(r=>r.json()) });
  const [custId,   setCustId]  = useState("");
  const [file,     setFile]    = useState<File|null>(null);
  const [loading,  setLoading] = useState(false);
  const [msg,      setMsg]     = useState<{ type:"success"|"error"; text:string }|null>(null);
  const [stats,    setStats]   = useState<DeduplicateStats|null>(null);
  const [details,  setDetails] = useState<DedupDetails|null>(null);
  const [activePane, setPane]  = useState<keyof DedupDetails>("added");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!custId || !file) return;
    setLoading(true); setMsg(null); setStats(null); setDetails(null);
    const fd = new FormData();
    fd.append("customerId", custId);
    fd.append("file", file);
    const res = await fetch("/api/upload", { method:"POST", body:fd });
    setLoading(false);
    const json = await res.json();
    if (!res.ok) { setMsg({ type:"error", text:json.error }); return; }
    setStats(json.stats);
    setMsg({ type:"success", text:`Upload complete. ${json.stats.total} total records, ${json.stats.added} new, ${json.stats.updated} updated.` });
    qc.invalidateQueries({ queryKey:["ticketData", custId] });
  };

  const PANES: { key:keyof DedupDetails; label:string; color:string }[] = [
    { key:"added",   label:`New (${stats?.added??0})`,      color:"#22c55e" },
    { key:"updated", label:`Updated (${stats?.updated??0})`,color:"#3d6fd4" },
    { key:"skipped", label:`Skipped (${stats?.skipped??0})`,color:"#6b8fd4" },
    { key:"noDate",  label:`No Date (${stats?.noDate??0})`, color:"#f59e0b" },
  ];

  const TICKET_COLS: ColDef[] = [
    { key:"number",           label:"Ticket #",  bold:true },
    { key:"type",             label:"Type" },
    { key:"assignment_group", label:"Group" },
    { key:"state",            label:"State" },
    { key:"sys_created_on",   label:"Created" },
    { key:"sys_updated_on",   label:"Updated" },
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-lg font-extrabold text-theme-text">Upload Ticket Data</h2>

      <Card>
        <div className="space-y-4">
          <Select label="Customer" value={custId} onChange={e=>setCustId(e.target.value)}
            options={[{value:"",label:"— Select customer —"},...customers.map(c=>({value:c.id,label:c.name}))]}/>

          <div>
            <div className="text-xs font-semibold text-theme-dim uppercase tracking-wide mb-1.5">CSV File</div>
            <div
              onClick={()=>inputRef.current?.click()}
              className="border-2 border-dashed border-theme-border rounded-lg p-8 text-center cursor-pointer hover:border-theme-blue transition-colors">
              {file
                ? <><div className="text-2xl mb-1">📄</div><div className="text-sm font-bold text-theme-text">{file.name}</div><div className="text-xs text-theme-dim">{(file.size/1024).toFixed(1)} KB</div></>
                : <><div className="text-2xl mb-1">📂</div><div className="text-sm text-theme-dim">Click to choose a CSV file</div></>
              }
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e=>setFile(e.target.files?.[0]??null)}/>
            </div>
          </div>

          <Button onClick={handleUpload} loading={loading} disabled={!custId||!file}>
            Upload & Process
          </Button>
        </div>
      </Card>

      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      {stats && (
        <Card>
          <SectionTitle>Upload Results</SectionTitle>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {PANES.map(p => (
              <div key={p.key} className="rounded-md p-3 border text-center cursor-pointer transition-colors"
                style={{ borderColor: activePane===p.key ? p.color : "rgb(var(--border))", background: activePane===p.key ? `${p.color}11`:undefined }}
                onClick={() => setPane(p.key)}>
                <div className="text-xl font-extrabold" style={{ color:p.color }}>
                  {stats[p.key as keyof DeduplicateStats]}
                </div>
                <div className="text-[10px] text-theme-dim mt-0.5">{p.label}</div>
              </div>
            ))}
          </div>

          {details && details[activePane].length > 0 && (
            <DataTable cols={TICKET_COLS} rows={details[activePane] as Record<string,unknown>[]} pageSize={15}/>
          )}
          {details && details[activePane].length === 0 && (
            <div className="text-center text-theme-dim text-sm py-6">No records in this category.</div>
          )}
        </Card>
      )}

      <Card>
        <SectionTitle>CSV Format Requirements</SectionTitle>
        <div className="text-xs text-theme-dim space-y-1.5">
          <p>The CSV must have a header row. Accepted field names (case-insensitive):</p>
          <ul className="list-disc list-inside space-y-0.5 mt-2">
            <li><b className="text-theme-text">Ticket number:</b> number, Number, ticket_number</li>
            <li><b className="text-theme-text">Type:</b> type, Type (contains "task" → Catalog Task, else Incident)</li>
            <li><b className="text-theme-text">Category:</b> category, Category</li>
            <li><b className="text-theme-text">Priority:</b> priority, Priority</li>
            <li><b className="text-theme-text">Assignment group:</b> assignment_group, Assignment group</li>
            <li><b className="text-theme-text">Assigned to:</b> assigned_to, Assigned to, technician</li>
            <li><b className="text-theme-text">State:</b> state, State, status</li>
            <li><b className="text-theme-text">Created:</b> sys_created_on, Created, opened_at</li>
            <li><b className="text-theme-text">Updated:</b> sys_updated_on, Updated, resolved_at</li>
            <li><b className="text-theme-text">Description:</b> short_description, description, title</li>
            <li><b className="text-theme-text">Work notes:</b> work_notes, notes, comments</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
