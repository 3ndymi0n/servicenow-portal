"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card }   from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert }  from "@/components/ui/Alert";
import { Modal }  from "@/components/ui/Modal";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import type { BusinessUnit, Customer } from "@/types";
import { ALL_GROUPS } from "@/lib/analytics/constants";

const BLANK = { name:"", customerId:"", groups:[] as string[] };

export default function BusinessUnitsPage() {
  const qc = useQueryClient();
  const { data:bus=[], isLoading } = useQuery<BusinessUnit[]>({ queryKey:["business-units"], queryFn:()=>fetch("/api/business-units").then(r=>r.json()) });
  const { data:customers=[] }     = useQuery<Customer[]>({ queryKey:["customers"], queryFn:()=>fetch("/api/customers").then(r=>r.json()) });
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<BusinessUnit|null>(null);
  const [form,      setForm]      = useState({ ...BLANK });
  const [msg,       setMsg]       = useState<{ type:"success"|"error"; text:string }|null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const url    = editing ? `/api/business-units/${editing.id}` : "/api/business-units";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["business-units"] }); setMsg({ type:"success", text:"Saved." }); setShowModal(false); },
    onError:   (e:Error) => setMsg({ type:"error", text:e.message }),
  });

  const openNew  = () => { setEditing(null); setForm({ ...BLANK }); setShowModal(true); };
  const openEdit = (b:BusinessUnit) => { setEditing(b); setForm({ name:b.name, customerId:b.customerId, groups:[...b.groups] }); setShowModal(true); };
  const toggleGroup = (g:string) => setForm(f=>({ ...f, groups:f.groups.includes(g)?f.groups.filter(x=>x!==g):[...f.groups,g] }));

  const COLS: ColDef[] = [
    { key:"name",       label:"Business Unit", bold:true },
    { key:"customerId", label:"Customer", render:(v)=>customers.find(c=>c.id===v)?.name??v as string },
    { key:"groups",     label:"Groups", render:(v)=><span className="text-dark-dim">{(v as string[]).join(", ")}</span> },
    { key:"id", label:"", render:(_,row)=><button onClick={()=>openEdit(row as unknown as BusinessUnit)} className="text-xs text-dark-dim hover:text-dark-accent">Edit</button> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-extrabold text-dark-text">Business Units ({bus.length})</h2>
        <Button onClick={openNew} size="sm">+ New BU</Button>
      </div>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <Card>
        {isLoading
          ? <div className="py-10 text-center text-dark-dim text-sm animate-pulse">Loading…</div>
          : <DataTable cols={COLS} rows={bus as unknown as Record<string,unknown>[]}/>
        }
      </Card>
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"Edit Business Unit":"New Business Unit"} size="md">
        <div className="p-6 space-y-4">
          <Input label="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
          <Select label="Customer" value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))}
            options={[{value:"",label:"— Select —"},...customers.map(c=>({value:c.id,label:c.name}))]}/>
          <div>
            <div className="text-xs font-semibold text-dark-dim uppercase tracking-wide mb-2">Resolver Groups</div>
            <div className="flex flex-wrap gap-2">
              {ALL_GROUPS.map(g => (
                <label key={g} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={form.groups.includes(g)} onChange={()=>toggleGroup(g)} className="accent-dark-blue"/>
                  {g}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-border">
            <Button variant="secondary" onClick={()=>setShowModal(false)}>Cancel</Button>
            <Button onClick={()=>save.mutate()} loading={save.isPending}>{editing?"Save":"Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
