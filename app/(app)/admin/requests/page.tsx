"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import type { AccessRequest, User, Customer } from "@/types";

const STATUS_COLORS: Record<string,string> = { pending:"#f59e0b", approved:"#22c55e", denied:"#ef4444" };

export default function RequestsPage() {
  const qc = useQueryClient();
  const { data:requests=[], isLoading } = useQuery<AccessRequest[]>({ queryKey:["access-requests"], queryFn:()=>fetch("/api/access-requests").then(r=>r.json()) });
  const { data:users=[] }    = useQuery<User[]>({ queryKey:["users"], queryFn:()=>fetch("/api/users").then(r=>r.json()) });
  const { data:customers=[] }= useQuery<Customer[]>({ queryKey:["customers"], queryFn:()=>fetch("/api/customers").then(r=>r.json()) });

  const handle = useMutation({
    mutationFn: ({id,status}: {id:string;status:"approved"|"denied"}) =>
      fetch(`/api/access-requests/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) }).then(r=>r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey:["access-requests"] }),
  });

  const pending = requests.filter(r=>r.status==="pending");
  const handled = requests.filter(r=>r.status!=="pending");

  const COLS: ColDef[] = [
    { key:"userId",     label:"User",     render:(v)=>{ const u=users.find(x=>x.id===v); return u?.displayName??u?.username??v as string; } },
    { key:"customerId", label:"Customer", render:(v)=>customers.find(c=>c.id===v)?.name??v as string },
    { key:"reason",     label:"Reason",   render:(v)=><span className="text-dark-dim truncate max-w-xs block">{v as string}</span> },
    { key:"createdAt",  label:"Requested",render:(v)=>new Date(v as string).toLocaleDateString("en-AU") },
    { key:"status",     label:"Status",   render:(v)=><Badge color={STATUS_COLORS[v as string]}>{(v as string).toUpperCase()}</Badge> },
    { key:"id", label:"Actions", render:(_,row)=> row.status==="pending" ? (
        <div className="flex gap-2">
          <button onClick={()=>handle.mutate({id:row.id as string,status:"approved"})} className="text-xs text-success hover:underline">Approve</button>
          <button onClick={()=>handle.mutate({id:row.id as string,status:"denied"})}   className="text-xs text-danger hover:underline">Deny</button>
        </div>
      ) : null
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-dark-text">Access Requests</h2>
      <Card>
        <SectionTitle>Pending ({pending.length})</SectionTitle>
        {isLoading
          ? <div className="py-8 text-center text-dark-dim text-sm animate-pulse">Loading…</div>
          : pending.length === 0
            ? <div className="py-8 text-center text-dark-dim text-sm">No pending requests.</div>
            : <DataTable cols={COLS} rows={pending as unknown as Record<string,unknown>[]}/>
        }
      </Card>
      {handled.length > 0 && (
        <Card>
          <SectionTitle>History ({handled.length})</SectionTitle>
          <DataTable cols={COLS} rows={handled as unknown as Record<string,unknown>[]} pageSize={10}/>
        </Card>
      )}
    </div>
  );
}
