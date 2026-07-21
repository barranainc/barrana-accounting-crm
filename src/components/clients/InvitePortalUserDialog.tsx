"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { invitePortalUser } from "@/actions/clients";
import { UserPlus, Loader2, X, RefreshCw, Copy, Check, KeyRound } from "lucide-react";

interface Props {
  clientId: string;
  /** Pre-fills the form — usually the client's business name / primary email. */
  defaultName?: string;
  defaultEmail?: string;
}

// Ambiguous characters (0/O, 1/l/I) left out so the password is easy to read out loud.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function generatePassword(): string {
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < buf.length; i++) s += CHARS[buf[i] % CHARS.length];
  return `Prt-${s}!`;
}

export function InvitePortalUserDialog({ clientId, defaultName = "", defaultEmail = "" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  // Generated only when the form opens — never during render, so the server and the
  // client can't disagree on the value (that would be a hydration mismatch).
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function openForm() {
    setError(null);
    setCreated(null);
    setName(defaultName);
    setEmail(defaultEmail);
    setPassword(generatePassword());
    setOpen(true);
  }

  function submit() {
    if (!name.trim()) return setError("Please enter a name.");
    if (!email.trim()) return setError("Please enter an email address.");
    if (password.trim().length < 8) return setError("Password must be at least 8 characters.");
    setError(null);
    startTransition(async () => {
      try {
        await invitePortalUser({
          clientId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          tempPassword: password,
        });
        setCreated({ email: email.trim().toLowerCase(), password });
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create the portal login.");
      }
    });
  }

  async function copyCreds() {
    if (!created) return;
    await navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Credentials handed back after a successful invite ──────────────────────
  if (created) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800">
          <Check className="h-4 w-4" /> Portal login created
        </p>
        <p className="mt-1 text-xs text-green-700">
          Share these with the client — the password is shown only once, so copy it now.
        </p>
        <div className="mt-3 space-y-1 rounded-md border border-green-200 bg-white px-3 py-2 font-mono text-sm">
          <p><span className="text-muted-foreground">Email:</span> {created.email}</p>
          <p><span className="text-muted-foreground">Password:</span> {created.password}</p>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={copyCreds}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-xs text-green-800 hover:bg-green-100 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Collapsed button ───────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={openForm}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invite to portal
      </button>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md rounded-lg border border-brand-greyBorder bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-brand-navy" /> Invite client to portal
        </p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Jane Smith"
        className="mb-3 w-full rounded-md border border-brand-greyBorder px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />

      <label className="mb-1 block text-xs font-medium text-muted-foreground">Email (this is their login)</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="client@example.com"
        className="mb-3 w-full rounded-md border border-brand-greyBorder px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />

      <label className="mb-1 block text-xs font-medium text-muted-foreground">Temporary password</label>
      <div className="mb-3 flex gap-2">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="flex-1 rounded-md border border-brand-greyBorder px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
        <button
          type="button"
          onClick={() => setPassword(generatePassword())}
          title="Generate a new password"
          className="inline-flex items-center gap-1 rounded-md border border-brand-greyBorder px-2.5 text-xs text-muted-foreground hover:bg-brand-greyLight transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark disabled:opacity-60 transition-colors"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {pending ? "Creating…" : "Create portal login"}
      </button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">
        No email is sent automatically — you&apos;ll get the credentials to pass on to the client.
      </p>
    </div>
  );
}
