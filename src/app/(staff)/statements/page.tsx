import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusPill } from "@/components/statements/StatusPill";
import { createBankStatement } from "@/actions/statements";
import { formatDate } from "@/lib/utils";
import type { StatementKind } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Landmark, Upload } from "lucide-react";

export const metadata = { title: "Bank Imports" };

export default async function StatementsPage() {
  await requireStaff();

  const [statements, clients] = await Promise.all([
    db.bankStatement.findMany({
      include: {
        client: { select: { id: true, businessName: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
  ]);

  async function handleUpload(formData: FormData) {
    "use server";
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string;
    const kind = (formData.get("kind") as string) === "CREDIT_CARD" ? "CREDIT_CARD" : "BANK";
    if (!file || !clientId || file.size === 0) return;
    const bytes = await file.arrayBuffer();
    const { statementId } = await createBankStatement({
      clientId,
      kind: kind as StatementKind,
      fileBuffer: Buffer.from(bytes),
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      fileSize: file.size,
    });
    redirect(`/statements/${statementId}`);
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 shrink-0">
          <Landmark className="h-5 w-5 text-brand-navy" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Bank Imports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a client bank or credit-card statement, extract its transactions with OCR, review,
            and export a QuickBooks-ready CSV.
          </p>
        </div>
      </div>

      {/* Upload */}
      <SectionCard title="Upload a statement" className="mb-6">
        <form action={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Client</label>
            <select
              name="clientId"
              required
              defaultValue=""
              className="mt-1 w-full h-9 rounded-md border border-brand-greyBorder bg-white px-2 text-sm"
            >
              <option value="" disabled>
                Select client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              name="kind"
              defaultValue="BANK"
              className="mt-1 w-full h-9 rounded-md border border-brand-greyBorder bg-white px-2 text-sm"
            >
              <option value="BANK">Bank statement</option>
              <option value="CREDIT_CARD">Credit-card statement</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">File (PDF or image)</label>
            <input
              type="file"
              name="file"
              required
              accept="application/pdf,image/png,image/jpeg"
              className="mt-1 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-greyLight file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          The file is stored as an internal document. You&apos;ll process it on the next screen.
        </p>
      </SectionCard>

      {/* List */}
      <SectionCard title={`Statements (${statements.length})`} noPadding>
        {statements.length === 0 ? (
          <p className="text-sm text-muted-foreground p-5">No statements yet. Upload one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-greyLight text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Account</th>
                  <th className="px-4 py-2.5">Period</th>
                  <th className="px-4 py-2.5 text-right">Txns</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-greyBorder">
                {statements.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-greyLight/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/statements/${s.id}`} className="font-medium hover:text-brand-navy">
                        {s.client.businessName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {s.kind === "CREDIT_CARD" ? "Credit card" : "Bank"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {s.institution ?? "—"}
                      {s.accountNumberMasked ? ` ${s.accountNumberMasked}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {s.periodStart || s.periodEnd
                        ? `${s.periodStart ? formatDate(s.periodStart) : "—"} – ${
                            s.periodEnd ? formatDate(s.periodEnd) : "—"
                          }`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s._count.transactions}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
