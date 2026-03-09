"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button }   from "@/components/ui/Button";
import { Input }    from "@/components/ui/Input";
import { Select }   from "@/components/ui/Select";
import { Badge }    from "@/components/ui/Badge";
import { Alert }    from "@/components/ui/Alert";
import { Modal }    from "@/components/ui/Modal";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import type { User, Customer, BusinessUnit } from "@/types";

const ROLE_COLORS: Record<string,string> = { admin:"#f59e0b", analyst:"#3d6fd4", viewer:"#6b8fd4", employee:"#14b8a6" };
const BLANK_FORM = { username:"", email:"", password:"", role:"analyst" as User["role"],
  displayName:"", isExecutive:false, isCustomerManager:false, businessUnit:"", active:true };

export default function UsersPage() {
  const qc = useQueryClient();
  const { data:users=[], isLoading } = useQuery<User[]>({ queryKey:["users"], queryFn:()=>fetch("/api/users").then(r=>r.json()) });
  const { data:customers=[] }        = useQuery<Customer[]>({ queryKey:["customers"], queryFn:()=>fetch("/api/customers").then(r=>r.json()) });
  const { data:bus=[] }              = useQuery<BusinessUnit[]>({ queryKey:["business-units"], queryFn:()=>fetch("/api/business-units").then(r=>r.json()) });

  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<User|null>(null);
  const [form,      setForm]      = useState({ ...BLANK_FORM });
  const [msg,       setMsg]       = useState<{ type:"success"|"error"; text:string }|null>(null);

  const save = useMutation({
    mutationFn: async (data: typeof BLANK_FORM) => {
      const url    = editing ? `/api/users/${editing.id}` : "/api/users";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:["users"] });
      setMsg({ type:"success", text: editing ? "User updated." : "User created." });
      setShowModal(false);
    },
    onError: (e:Error) => setMsg({ type:"error", text:e.message }),
  });

  const toggleActive = useMutation({
    mutationFn: (u:User) => fetch(`/api/users/${u.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ active:!u.active }) }).then(r=>r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey:["users"] }),
  });

  const openEdit = (u:User) => { setEditing(u); setForm({ username:u.username, email:u.email, password:"",
    role:u.role, displayName:u.displayName??"", isExecutive:u.isExecutive, isCustomerManager:u.isCustomerManager,
    businessUnit:u.businessUnit??"", active:u.active }); setShowModal(true); };
  const openNew  = () => { setEditing(null); setForm({ ...BLANK_FORM }); setShowModal(true); };

  const COLS: ColDef[] = [
    { key:"username",    label:"Username", bold:true },
    { key:"displayName", label:"Name" },
    { key:"email",       label:"Email" },
    { key:"role",        label:"Role", render:(v)=><Badge color={ROLE_COLORS[v as string]}>{v as string}</Badge> },
    { key:"active",      label:"Active", render:(v)=><span style={{ color: v?"#22c55e":"#ef4444" }}>{v?"●":"○"}</span> },
    { key:"id",          label:"", render:(_,row)=>(
        <div className="flex gap-2">
          <button onClick={()=>openEdit(row as unknown as User)} className="text-dark-dim hover:text-dark-accent text-xs">Edit</button>
          <button onClick={()=>toggleActive.mutate(row as unknown as User)} className="text-dark-dim hover:text-warning text-xs">
            {(row as User).active?"Deactivate":"Activate"}
          </button>
        </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-extrabold text-dark-text">Users ({users.length})</h2>
        <Button onClick={openNew} size="sm">+ New User</Button>
      </div>

      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      <Card>
        {isLoading
          ? <div className="py-10 text-center text-dark-dim text-sm animate-pulse">Loading…</div>
          : <DataTable cols={COLS} rows={users as unknown as Record<string,unknown>[]} pageSize={25}/>
        }
      </Card>

      {/* Create / Edit modal */}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"Edit User":"New User"} size="md">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username"    value={form.username}    onChange={e=>setForm(f=>({...f,username:e.target.value}))}    required disabled={!!editing}/>
            <Input label="Email"       value={form.email}       onChange={e=>setForm(f=>({...f,email:e.target.value}))}       required/>
            <Input label="Display Name" value={form.displayName} onChange={e=>setForm(f=>({...f,displayName:e.target.value}))}/>
            <Input label="Password"    type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
              hint={editing?"Leave blank to keep current password":""} required={!editing}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Role" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as User["role"]}))}
              options={[{value:"admin",label:"Administrator"},{value:"analyst",label:"Analyst"},{value:"viewer",label:"Viewer"},{value:"employee",label:"Employee"}]}/>
            <Select label="Business Unit" value={form.businessUnit} onChange={e=>setForm(f=>({...f,businessUnit:e.target.value}))}
              options={[{value:"",label:"— None —"},...bus.map(b=>({value:b.id,label:b.name}))]}/>
          </div>
          <div className="flex gap-6 text-sm text-dark-dim">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isExecutive} onChange={e=>setForm(f=>({...f,isExecutive:e.target.checked}))} className="accent-dark-blue"/>
              Executive view
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isCustomerManager} onChange={e=>setForm(f=>({...f,isCustomerManager:e.target.checked}))} className="accent-dark-blue"/>
              Customer Manager
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-border">
            <Button variant="secondary" onClick={()=>setShowModal(false)}>Cancel</Button>
            <Button onClick={()=>save.mutate(form)} loading={save.isPending}>
              {editing?"Save Changes":"Create User"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
