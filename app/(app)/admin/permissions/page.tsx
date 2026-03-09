"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button }  from "@/components/ui/Button";
import { Alert }   from "@/components/ui/Alert";
import type { User, Customer } from "@/types";
import { ALL_GROUPS } from "@/lib/analytics/constants";

export default function PermissionsPage() {
  const qc = useQueryClient();
  const { data:users=[] }     = useQuery<User[]>({ queryKey:["users"], queryFn:()=>fetch("/api/users").then(r=>r.json()) });
  const { data:customers=[] } = useQuery<Customer[]>({ queryKey:["customers"], queryFn:()=>fetch("/api/customers").then(r=>r.json()) });
  const [selectedUser, setSelectedUser] = useState<User|null>(null);
  const [custPerms,    setCustPerms]    = useState<Record<string,string[]|"*">>({});
  const [allowedCusts, setAllowedCusts] = useState<string[]>([]);
  const [msg, setMsg] = useState<{type:"success"|"error";text:string}|null>(null);

  const nonAdmin = useMemo(() => users.filter(u => u.role !== "admin"), [users]);

  const loadUser = (u:User) => {
    setSelectedUser(u);
    setAllowedCusts(u.customers.includes("*") ? customers.map(c=>c.id) : [...u.customers]);
    const ag: Record<string,string[]|"*"> = {};
    customers.forEach(c => { ag[c.id] = u.allowedGroups[c.id] ?? "*"; });
    setCustPerms(ag);
  };

  const hasAll  = (cid:string) => custPerms[cid] === "*";
  const toggle  = (cid:string, g:string) => {
    const cur = hasAll(cid) ? [...ALL_GROUPS] : (custPerms[cid] as string[]||[]);
    const next = cur.includes(g) ? cur.filter(x=>x!==g) : [...cur,g];
    setCustPerms(p=>({ ...p, [cid]: next.length===ALL_GROUPS.length?"*":next }));
  };

  const save = useMutation({
    mutationFn: () => {
      if (!selectedUser) throw new Error("No user");
      const body = { customers: allowedCusts, allowedGroups: Object.fromEntries(allowedCusts.map(cid => [cid, custPerms[cid]??'*'])) };
      return fetch(`/api/users/${selectedUser.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }).then(r=>r.json());
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["users"]}); setMsg({type:"success",text:"Permissions saved."}); },
    onError:   (e:Error) => setMsg({type:"error",text:e.message}),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-dark-text">Permissions</h2>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <div className="grid grid-cols-3 gap-4">
        {/* User list */}
        <Card>
          <SectionTitle>Users</SectionTitle>
          <div className="space-y-1">
            {nonAdmin.map(u => (
              <button key={u.id} onClick={()=>loadUser(u)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${selectedUser?.id===u.id?"bg-dark-blue/20 text-dark-accent":"text-dark-dim hover:bg-dark-muted"}`}>
                <div className="font-bold">{u.displayName??u.username}</div>
                <div className="text-[10px] opacity-70">{u.role} · {u.email}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Permission editor */}
        {selectedUser && (
          <div className="col-span-2 space-y-4">
            <Card>
              <SectionTitle>Customer Access — {selectedUser.displayName??selectedUser.username}</SectionTitle>
              <div className="space-y-4">
                {customers.map(c => {
                  const hasCust = allowedCusts.includes(c.id);
                  const groups  = hasAll(c.id) ? ALL_GROUPS : (custPerms[c.id] as string[])||[];
                  return (
                    <div key={c.id} className="border border-dark-border rounded-md p-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-dark-text mb-2 cursor-pointer">
                        <input type="checkbox" checked={hasCust}
                          onChange={e => setAllowedCusts(prev => e.target.checked ? [...prev,c.id] : prev.filter(x=>x!==c.id))}
                          className="accent-dark-blue"/>
                        {c.name} <span className="text-dark-dim font-normal text-xs">({c.code})</span>
                      </label>
                      {hasCust && (
                        <div className="pl-5 space-y-1">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer text-dark-dim">
                            <input type="checkbox" checked={hasAll(c.id)} onChange={e => setCustPerms(p=>({...p,[c.id]:e.target.checked?"*":[]}))} className="accent-dark-blue"/>
                            All groups
                          </label>
                          {!hasAll(c.id) && ALL_GROUPS.map(g => (
                            <label key={g} className="flex items-center gap-1.5 text-xs cursor-pointer ml-4 text-dark-dim">
                              <input type="checkbox" checked={(custPerms[c.id] as string[]||[]).includes(g)} onChange={()=>toggle(c.id,g)} className="accent-dark-blue"/>
                              {g}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-dark-border">
                <Button onClick={()=>save.mutate()} loading={save.isPending}>Save Permissions</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
