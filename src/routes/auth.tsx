import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Layers, LogIn, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { accountEmail } from "@/lib/canvas/accounts";
import { prepareAdminAccount } from "@/lib/canvas/admin.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — CanvasStack" },
    { name: "description", content: "Sign in to your private CanvasStack scenario workspace." },
    { property: "og:title", content: "Sign in — CanvasStack" },
    { property: "og:description", content: "Your business models, experiments and canvas journey." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SignIn,
});

export function SignIn() {
  const navigate = useNavigate();
  const prepareAdmin = useServerFn(prepareAdminAccount);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => { if (alive && data.user) void navigate({ to: "/workspace", replace: true }); });
    return () => { alive = false; };
  }, [navigate]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (username.trim().toLowerCase() === "admin") {
        const setup = await prepareAdmin();
        if (!setup.ready) throw new Error("The administrator account needs organiser setup before sign-in.");
      }
      const { error: failure } = await supabase.auth.signInWithPassword({ email: accountEmail(username), password });
      if (failure) throw new Error("Couldn't sign in. Check your username and password, then try again.");
      setPassword("");
      await navigate({ to: "/workspace", replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't sign in. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-dvh place-items-center bg-background px-5 py-12 grid-paper">
    <section className="w-full max-w-sm">
      <Layers className="mb-5 size-10 text-signal" />
      <h1 className="font-display text-3xl font-semibold">CanvasStack</h1>
      <p className="mt-2 text-muted-foreground">Sign in to your workspace</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 text-base" /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={visible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-12 text-base" /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-11" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="h-11 w-full"><LogIn /> {busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">Accounts are provided by your workshop organiser. Contact them for access or a password reset.</p>
    </section>
  </main>;
}