"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card }     from "@/components/ui/Card";
import { Button }   from "@/components/ui/Button";
import { Input }    from "@/components/ui/Input";
import { Alert }    from "@/components/ui/Alert";
import { Modal }    from "@/components/ui/Modal";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import { CustomerTargetsPanel } from "@/components/admin/CustomerTargetsPanel";
import type { Customer } from "@/types";
import { ALL_GROUPS } from "@/lib/analytics/constants";

const BLANK = { name:"", code:"", industry:"", resolverGroups:[] as string[] };

export default function CustomersPage() {
  const qc = useQueryClient();
  const { data:customers=[], isLoading } = useQuery<Customer[]>({
    queryKey:["customers"], queryFn:()=>fetch("/api/customers").then(r=>r.json()),
  });
  const [showModal, setShowModal]   = useState(false);
  const [showTargets,setShowTargets]= useState<string|null>(null);
  const [editing,   setEditing]     = useState<Customer|null>(null);
  const [form,      setForm]        = useState({ ...BLANK });
  const [msg,       setMsg]         = useState<{ type:"success"|"error"; text:string }|null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const url    = editing ? `/api/customers/${editing.id}` : "/api/customers";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["customers"] }); setMsg({ type:"success", text:"Saved." }); setShowModal(false); },
    onError:   (e:Error) => setMsg({ type:"error", text:e.message }),
  });

  const openNew  = () => { setEditing(null); setForm({ ...BLANK }); setShowModal(true); };
  const openEdit = (c:Customer) => { setEditing(c); setForm({ name:c.name, code:c.code, industry:c.industry, resolverGroups:[...c.resolverGroups] }); setShowModal(true); };
  const toggleGroup = (g:string) => setForm(f => ({ ...f, resolverGroups: f.resolverGroups.includes(g) ? f.resolverGroups.filter(x=>x!==g) : [...f.resolverGroups,g] }));

  const COLS: ColDef[] = [
    { key:"name",     label:"Customer",   bold:true },
    { key:"code",     label:"Code" },
    { key:"industry", label:"Industry" },
    { key:"resolverGroups", label:"Groups", render:(v)=><span className="text-dark-dim">{(v as string[]).length} groups</span> },
    { key:"id", label:"", render:(_,row)=>(
      <div className="flex gap-2">
        <button onClick={()=>openEdit(row as unknown as Customer)} className="text-xs text-dark-dim hover:text-dark-accent">Edit</button>
        <button onClick={()=>setShowTargets((row as Customer).id)} className="text-xs text-dark-dim hover:text-warning">🎯 Targets</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-extrabold text-dark-text">Customers ({customers.length})</h2>
        <Button onClick={openNew} size="sm">+ New Customer</Button>
      </div>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <Card>
        {isLoading
          ? <div className="py-10 text-center text-dark-dim text-sm animate-pulse">Loading…</div>
          : <DataTable cols={COLS} rows={customers as unknown as Record<string,unknown>[]}/>
        }
      </Card>

      {/* Create/Edit modal */}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"Edit Customer":"New Customer"} size="md">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name"     value={form.name}     onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
            <Input label="Code"     value={form.code}     onChange={e=>setForm(f=>({...f,code:e.target.value}))} required hint="Short uppercase ID, e.g. ACME"/>
            <Input label="Industry" value={form.industry} onChange={e=>setForm(f=>({...f,industry:e.target.value}))} required className="col-span-2"/>
          </div>
          <div>
            <div className="text-xs font-semibold text-dark-dim uppercase tracking-wide mb-2">Resolver Groups</div>
            <div className="flex flex-wrap gap-2">
              {ALL_GROUPS.map(g => (
                <label key={g} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={form.resolverGroups.includes(g)} onChange={()=>toggleGroup(g)} className="accent-dark-blue"/>
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

      {/* Targets modal */}
      <Modal open={!!showTargets} onClose={()=>setShowTargets(null)} title="Customer Targets" size="lg">
        {showTargets && <CustomerTargetsPanel customerId={showTargets}/>}
      </Modal>
    </div>
  );
}
