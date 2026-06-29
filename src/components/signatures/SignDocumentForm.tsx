"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeSignature, markSignatureViewed } from "@/actions/signatures";
import { PenLine, Type, Eraser, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  sigRequestId: string;
  documentTitle: string;
  defaultName: string;
}

export function SignDocumentForm({ sigRequestId, documentTitle, defaultName }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<"typed" | "drawn">("typed");
  const [name, setName] = useState(defaultName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Record that the signer opened (viewed) the request.
  useEffect(() => {
    markSignatureViewed(sigRequestId).catch(() => {});
  }, [sigRequestId]);

  // Size + style the canvas when draw mode becomes active.
  useEffect(() => {
    if (mode !== "drawn") return;
    const c = canvasRef.current;
    if (!c) return;
    c.width = c.clientWidth;
    c.height = 180;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f2a4a";
    setHasDrawn(false);
  }, [mode]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }
  function moveTo(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }
  function clearPad() {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  function sign() {
    setError(null);
    if (!name.trim()) return setError("Please enter your full legal name.");
    if (mode === "drawn" && !hasDrawn) return setError("Please draw your signature.");
    if (!consent) return setError("Please check the box to confirm you agree to sign electronically.");

    const signatureImage = mode === "drawn" ? canvasRef.current!.toDataURL("image/png") : null;
    start(async () => {
      try {
        await completeSignature(sigRequestId, {
          signerName: name.trim(),
          signatureType: mode,
          signatureImage,
          consent: true,
        });
        router.push("/portal/signatures?signed=1");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to sign. Please try again.");
      }
    });
  }

  const tabCls = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-brand-navy text-white" : "border border-brand-greyBorder bg-white text-muted-foreground hover:bg-brand-greyLight"
    }`;

  return (
    <div className="rounded-lg border border-brand-plum/20 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <PenLine className="h-4 w-4 text-brand-plum" />
        <p className="text-sm font-semibold">Sign this document</p>
      </div>

      {/* Full legal name */}
      <label className="mb-1 block text-xs font-medium text-muted-foreground">Full legal name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Jordan Patel"
        className="mb-4 w-full rounded-md border border-brand-greyBorder px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />

      {/* Method tabs */}
      <div className="mb-2 flex items-center gap-2">
        <button type="button" className={tabCls(mode === "typed")} onClick={() => setMode("typed")}>
          <Type className="h-3.5 w-3.5" /> Type
        </button>
        <button type="button" className={tabCls(mode === "drawn")} onClick={() => setMode("drawn")}>
          <PenLine className="h-3.5 w-3.5" /> Draw
        </button>
      </div>

      {/* Signature area */}
      {mode === "typed" ? (
        <div className="flex h-[120px] items-center justify-center rounded-md border border-dashed border-brand-greyBorder bg-brand-greyLight/40">
          <span
            className="text-4xl text-brand-navy"
            style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive", fontStyle: "italic" }}
          >
            {name.trim() || "Your signature"}
          </span>
        </div>
      ) : (
        <div className="rounded-md border border-brand-greyBorder bg-white">
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={moveTo}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
            className="h-[180px] w-full touch-none rounded-md"
          />
          <div className="flex items-center justify-between border-t border-brand-greyBorder px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Draw your signature above</span>
            <button type="button" onClick={clearPad} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Eraser className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Consent */}
      <label className="mt-4 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-greyBorder text-brand-navy focus:ring-brand-navy"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">
          I agree to sign <span className="font-medium text-foreground">{documentTitle}</span> electronically.
          I understand that my electronic signature is legally binding and equivalent to a handwritten signature
          under applicable e-signature law. My name, signature, IP address, and timestamp will be recorded.
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={sign}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-brand-plum px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-plum/90 disabled:opacity-60 transition-colors"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {pending ? "Signing…" : "Sign document"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/portal/signatures")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
