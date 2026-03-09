"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const DEMO_ACCOUNTS = [
  { username: "admin",    password: "Admin1234!", role: "Administrator",  color: "#f59e0b" },
  { username: "analyst1", password: "Pass1234!",  role: "Analyst",        color: "#3d6fd4" },
  { username: "viewer1",  password: "View1234!",  role: "Viewer",         color: "#6b8fd4" },
  { username: "emp1",     password: "Emp1234!",   role: "Employee",       color: "#14b8a6" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      username: username.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid username or password.");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="#5b9fff" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)"/>
        </svg>
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-dark-accent tracking-tight mb-1">MSP Portal</div>
          <div className="text-sm text-dark-dim">ServiceNow Intelligence Platform</div>
        </div>

        {/* Login card */}
        <div className="bg-dark-card border border-dark-border rounded-modal p-8 shadow-modal">
          <h1 className="text-lg font-bold text-dark-text mb-6">Sign in</h1>

          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          <div className="flex flex-col gap-4">
            <Input
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter password"
              autoComplete="current-password"
            />
            <Button
              onClick={handleLogin}
              loading={loading}
              fullWidth
              className="mt-2"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 bg-dark-surface border border-dark-border rounded-card p-4">
          <div className="text-[10px] font-semibold text-dark-dim uppercase tracking-wider mb-3">
            Demo Accounts
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.username}
                onClick={() => { setUsername(acc.username); setPassword(acc.password); }}
                className="flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-dark-muted transition-colors group"
              >
                <span className="font-mono text-dark-dim group-hover:text-dark-text">{acc.username}</span>
                <span className="font-semibold" style={{ color: acc.color }}>{acc.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
