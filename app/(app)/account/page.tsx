"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Input }  from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert }  from "@/components/ui/Alert";
import { Badge }  from "@/components/ui/Badge";
import type { SessionUser } from "@/lib/auth/session";

const ROLE_COLORS: Record<string,string> = { admin:"#f59e0b", analyst:"#3d6fd4", viewer:"#6b8fd4", employee:"#14b8a6" };

export default function AccountPage() {
  const { data:session, update } = useSession();
  const user = session?.user as SessionUser|undefined;

  const [displayName, setDisplayName]   = useState(user?.displayName ?? "");
  const [email,       setEmail]         = useState(user?.email ?? "");
  const [curPwd,      setCurPwd]        = useState("");
  const [newPwd,      setNewPwd]        = useState("");
  const [confirmPwd,  setConfirmPwd]    = useState("");
  const [msg, setMsg] = useState<{type:"success"|"error";text:string}|null>(null);

  const saveProfile = useMutation({
    mutationFn: () => fetch(`/api/users/${user?.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ displayName, email }),
    }).then(r=>r.json()),
    onSuccess: () => { setMsg({ type:"success", text:"Profile updated." }); update(); },
    onError:   (e:Error) => setMsg({ type:"error", text:e.message }),
  });

  const changePwd = useMutation({
    mutationFn: () => {
      if (newPwd !== confirmPwd) throw new Error("Passwords do not match.");
      if (newPwd.length < 8) throw new Error("Password must be at least 8 characters.");
      return fetch(`/api/users/${user?.id}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ password:newPwd }),
      }).then(r=>r.json());
    },
    onSuccess: () => { setMsg({ type:"success", text:"Password updated." }); setCurPwd(""); setNewPwd(""); setConfirmPwd(""); },
    onError:   (e:Error) => setMsg({ type:"error", text:e.message }),
  });

  const initials = (user?.displayName??user?.username??"?")[0]!.toUpperCase();

  return (
    <div className="flex-1 p-6 animate-fade-in max-w-xl">
      <h1 className="text-xl font-extrabold text-dark-text mb-5">My Account</h1>
      {msg && <Alert type={msg.type} className="mb-4">{msg.text}</Alert>}

      {/* Profile */}
      <Card className="mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold"
            style={{ background:`${ROLE_COLORS[user?.role??""]}22`, color:ROLE_COLORS[user?.role??""] }}>
            {initials}
          </div>
          <div>
            <div className="font-bold text-dark-text">{user?.displayName ?? user?.username}</div>
            <Badge color={ROLE_COLORS[user?.role??""]} className="mt-1">{user?.role}</Badge>
          </div>
        </div>
        <SectionTitle>Profile</SectionTitle>
        <div className="space-y-3">
          <Input label="Display Name" value={displayName} onChange={e=>setDisplayName(e.target.value)}/>
          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <Button onClick={()=>saveProfile.mutate()} loading={saveProfile.isPending} size="sm">Save Profile</Button>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <SectionTitle>Change Password</SectionTitle>
        <div className="space-y-3">
          <Input label="New Password"     type="password" value={newPwd}     onChange={e=>setNewPwd(e.target.value)}/>
          <Input label="Confirm Password" type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)}/>
          <Button onClick={()=>changePwd.mutate()} loading={changePwd.isPending} size="sm" variant="secondary">Update Password</Button>
        </div>
      </Card>
    </div>
  );
}
