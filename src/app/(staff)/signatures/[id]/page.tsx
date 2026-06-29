import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateTime, fileUrl } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileText, Eye, Download, ShieldCheck } from "lucide-react";

export const metadata = { title: "Signature" };

export default async function SignatureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const sig = await db.signatureRequest.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, businessName: true } },
      document: { select: { id: true, title: true, fileName: true } },
      requestedBy: { select: { name: true } },
    },
  });
  if (!sig) notFound();

  const signed = sig.status === "SIGNED";

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/signatures" className="flex items-center gap-1 hover:text-brand-navy">
          <ArrowLeft className="h-3.5 w-3.5" />
          Signatures
        </Link>
        <span>/</span>
        <Link href={`/clients/${sig.client.id}`} className="hover:text-brand-navy">
          {sig.client.businessName}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-plum/10 shrink-0">
          <ShieldCheck className="h-5 w-5 text-brand-plum" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{sig.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={sig.status} />
            <span className="text-xs text-muted-foreground">Requested by {sig.requestedBy.name}</span>
          </div>
        </div>
      </div>

      {/* Document */}
      <SectionCard title="Document" className="mb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy/5 shrink-0">
            <FileText className="h-5 w-5 text-brand-navy" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{sig.document.title}</p>
            <p className="text-xs text-muted-foreground">{sig.document.fileName}</p>
          </div>
          <a href={fileUrl(sig.document.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-navy hover:underline">
            <Eye className="h-3.5 w-3.5" /> View
          </a>
          <a href={fileUrl(sig.document.id, true)} className="inline-flex items-center gap-1 text-xs text-brand-navy hover:underline">
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        </div>
      </SectionCard>

      {/* Signature certificate */}
      {signed ? (
        <SectionCard title="Signature certificate">
          <div className="mb-4 rounded-md border border-brand-greyBorder bg-brand-greyLight/40 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Signature</p>
            {sig.signatureType === "drawn" && sig.signatureImage ? (
              <Image
                src={sig.signatureImage}
                alt={`Signature of ${sig.signerName ?? "signer"}`}
                width={360}
                height={120}
                unoptimized
                className="max-h-[120px] w-auto bg-white"
              />
            ) : (
              <span
                className="text-3xl text-brand-navy"
                style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive", fontStyle: "italic" }}
              >
                {sig.signerName}
              </span>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Signed by" value={sig.signerName ?? "—"} />
            <Field label="Signed at" value={sig.signedAt ? formatDateTime(sig.signedAt) : "—"} />
            <Field label="Method" value={sig.signatureType === "drawn" ? "Drawn" : "Typed"} />
            <Field label="IP address" value={sig.signerIp ?? "—"} />
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Device</dt>
              <dd className="mt-0.5 break-words text-xs">{sig.signerUserAgent ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Consent statement</dt>
              <dd className="mt-0.5 text-xs italic text-foreground">{sig.consentText ?? "—"}</dd>
            </div>
          </dl>
        </SectionCard>
      ) : (
        <SectionCard title="Status">
          <p className="text-sm text-muted-foreground">
            This document has not been signed yet
            {sig.sentAt ? ` — sent ${formatDateTime(sig.sentAt)}.` : "."}
            {sig.viewedAt && ` Viewed ${formatDateTime(sig.viewedAt)}.`}
          </p>
        </SectionCard>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
