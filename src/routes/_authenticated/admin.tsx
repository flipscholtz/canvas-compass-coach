import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createAccount, getAdminAccess, listAccounts, removeAccount } from "@/lib/canvas/admin.functions";

const accessOptions = queryOptions({ queryKey: ["admin-access"], queryFn: () => getAdminAccess(), staleTime: 0 });
const accountOptions = queryOptions({ queryKey: ["admin-accounts"], queryFn: () => listAccounts() });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Admin · Account management — CanvasStack" },
    { name: "description", content: "Manage organiser-provided CanvasStack username accounts securely." },
    { property: "og:title", content: "Admin · Account management — CanvasStack" },
    { property: "og:description", content: "Private account management for CanvasStack administrators." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: async ({ context }) => {
    const access = await context.queryClient.ensureQueryData(accessOptions);
    if (access.allowed) await context.queryClient.ensureQueryData(accountOptions);
  },
  component: AdminPage,
  errorComponent: () => <main className="p-6"><h1 className="text-xl font-semibold">Account management unavailable</h1><p className="mt-2 text-muted-foreground">Please return to your workspace and try again.</p><Button asChild variant="outline" className="mt-4"><Link to="/workspace">Return to canvas</Link></Button></main>,
});

function AdminPage() {
  const { data: access } = useSuspenseQuery(accessOptions);
  return <main className="min-h-dvh bg-background px-4 py-6 sm:px-8">
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost"><Link to="/workspace"><ArrowLeft /> Return to canvas</Link></Button>
      <header className="my-6 border-b pb-5"><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><ShieldCheck /> Admin</h1><p className="mt-2 text-muted-foreground">CanvasStack accounts</p></header>
      {access.allowed ? <AccountManagement /> : <p role="alert">Administrator access required.</p>}
    </div>
  </main>;
}

function AccountManagement() {
  const { data: accounts, refetch } = useSuspenseQuery(accountOptions);
  const add = useServerFn(createAccount);
  const remove = useServerFn(removeAccount);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<(typeof accounts)[number] | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await add({ data: { username, password } });
      setPassword(""); setUsername(""); setNotice(`Account ${result.username} created.`);
      await refetch();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn't create this account."); }
    finally { setBusy(false); }
  }
  async function confirmRemoval() {
    if (!target) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await remove({ data: { id: target.id } });
      setNotice(`Account ${target.username} removed.`); setTarget(null); await refetch();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn't remove this account."); setTarget(null); }
    finally { setBusy(false); }
  }
  return <>
    <section className="border-b pb-6"><h2 className="mb-4 font-semibold">Add account</h2>
      <form onSubmit={submit} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2"><Label htmlFor="new-username">Username</Label><Input id="new-username" required minLength={3} maxLength={32} autoComplete="off" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 text-base" /></div>
        <div className="space-y-2"><Label htmlFor="new-password">Password</Label><Input id="new-password" required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" /></div>
        <Button type="submit" disabled={busy} className="min-h-11"><UserPlus /> {busy ? "Please wait…" : "Add user"}</Button>
      </form>
    </section>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-signal">{notice}</p>}
    <section className="pt-6"><h2 className="mb-3 font-semibold">Users <span className="text-muted-foreground">({accounts.length})</span></h2>
      <ul className="divide-y">{accounts.map((account) => <li key={account.id} className="flex min-h-16 items-center justify-between gap-3 py-2">
        <div className="min-w-0"><p className="break-all font-medium">{account.username}</p>{account.username === "admin" && <p className="text-xs text-muted-foreground">Administrator · protected account</p>}</div>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Remove ${account.username}`} title={`Remove ${account.username}`} disabled={busy || account.username === "admin"} onClick={() => setTarget(account)}><Trash2 className="size-4" /></Button>
      </li>)}</ul>
    </section>
    <AlertDialog open={!!target} onOpenChange={(open) => { if (!open && !busy) setTarget(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {target?.username}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the account and all its private saved scenarios. Shared demos are not affected.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void confirmRemoval(); }}>{busy ? "Removing…" : "Remove account"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}