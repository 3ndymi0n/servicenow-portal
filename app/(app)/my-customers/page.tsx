"use client";
import { useState } from "react";
import { useSession }  from "next-auth/react";
import { useQuery }    from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Modal }       from "@/components/ui/Modal";
import { CustomerTargetsPanel } from "@/components/admin/CustomerTargetsPanel";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import type { Customer, AnalyticsData, AppNotification } from "@/types";
import type { SessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export default function MyCustomersPage() {
  const { data:session } = useSession();
  const user = session?.user as SessionUser|undefined;
  const [activeTab, setActiveTab] = useState<"overview"|"targets">("overview");
  const [targetsId, setTargetsId] = useState<string|null>(null);

  const { data:customers=[] } = useQuery<Customer[]>({ queryKey:["customers"], queryFn:()=>fetch("/api/customers").then(r=>r.json()) });
  const { data:notifs=[] }    = useQuery<AppNotification[]>({ queryKey:["notifications"], queryFn:()=>fetch("/api/notifications").then(r=>r.json()) });

  const managed = user?.managedCustomers ?? [];
  const myCusts = customers.filter(c => managed.includes(c.id) || user?.role==="admin");

  const NOTIF_COLS: ColDef[] = [
    { key:"customerName", label:"Customer",  bold:true },
    { key:"message",      label:"Message" },
    { key:"createdAt",    label:"Date",     render:(v)=>new Date(v as string).toLocaleDateString("en-AU") },
    { key:"read",         label:"",         render:(v)=><span style={{ color:v?"#6b8fd4":"#f59e0b" }}>{v?"":"● Unread"}</span> },
  ];

  const CUST_COLS: ColDef[] = [
    { key:"name",     label:"Customer",  bold:true },
    { key:"code",     label:"Code" },
    { key:"industry", label:"Industry" },
    { key:"resolverGroups", label:"Groups", render:(v)=><span className="text-dark-dim">{(v as string[]).length} groups</span> },
    { key:"id", label:"", render:(_,row)=>(
        <button onClick={()=>setTargetsId((row as Customer).id)} className="text-xs text-dark-dim hover:text-warning">🎯 Targets</button>
    )},
  ];

  return (
    <div className="flex-1 p-6 animate-fade-in">
      <h1 className="text-xl font-extrabold text-dark-text mb-4">My Customers</h1>

      <div className="flex gap-1 mb-4">
        {(["overview","targets"] as const).map(t => (
          <button key={t} onClick={()=>setActiveTab(t)}
            className={cn("px-4 py-1.5 rounded text-xs font-semibold transition-colors border",
              activeTab===t?"border-dark-blue text-dark-accent bg-dark-blue/20":"border-transparent text-dark-dim hover:border-dark-border")}>
            {t==="overview"?"📊 Overview":"🎯 Targets"}
          </button>
        ))}
      </div>

      {activeTab==="overview" && (
        <div className="space-y-4">
          <Card>
            <SectionTitle>Customer Portfolio ({myCusts.length})</SectionTitle>
            <DataTable cols={CUST_COLS} rows={myCusts as unknown as Record<string,unknown>[]}/>
          </Card>
          {notifs.length > 0 && (
            <Card>
              <SectionTitle>Notifications ({notifs.filter(n=>!n.read).length} unread)</SectionTitle>
              <DataTable cols={NOTIF_COLS} rows={notifs as unknown as Record<string,unknown>[]} pageSize={10}/>
            </Card>
          )}
        </div>
      )}

      {activeTab==="targets" && (
        <div className="space-y-4">
          {myCusts.map(c => (
            <Card key={c.id}>
              <SectionTitle>{c.name} — Targets</SectionTitle>
              <CustomerTargetsPanel customerId={c.id}/>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!targetsId} onClose={()=>setTargetsId(null)} title="Customer Targets" size="lg">
        {targetsId && <CustomerTargetsPanel customerId={targetsId}/>}
      </Modal>
    </div>
  );
}
