import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusPill } from "@/components/statements/StatusPill";
import { StatementReviewTable, type ReviewRow } from "@/components/statements/StatementReviewTable";
import { processBankStatement, markStatementReviewed, deleteBankStatement } from "@/actions/statements";
import { fileUrl, formatDate, formatMoney } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft, Landmark, Eye, FileSpreadsheet, FileDown, Play, RotateCcw, CheckCircle2, Trash2, AlertTriangle,
} from "lucide-react";

export const metadata = { title: "Statement" };

export default async function StatementDetailPage({
  params,
}: {
  params: Promise<{ statementId: string }>;
}) {
  await requireStaff();
  const { statementId } = await params;

  const statement = await db.bankStatement.findUnique({
    where: { id: statementId },
    include: {
      client: { select: { id: true, businessName: true } },
      document: { select: { id: true, fileName: true } },
      transactions: { orderBy: { sortIndex: "asc" } },
    },
  });

  if (!statement) notFound();

  const currency = statement.currency ?? "CAD";
  const hasTxns = statement.transactions.length > 0;
  const isReviewed = statement.status === "REVIEWED";

  const rows: ReviewRow[] = statement.transactions.map((t) => ({
    id: t.id,
    postedDate: t.postedDate.toISOString().slice(0, 10),
    description: t.description,
    amount: Number(t.amount),
    direction: t.direction,
    excluded: t.excluded,
    accountName: t.accountName ?? "",
    accountNumber: t.accountNumber ?? "",
    accountType: t.accountType ?? "",
    accountDetailType: t.accountDetailType ?? "",
  }));

  // ── Inline server actions ──
  async function doProcess() {
    "use server";
    await processBankStatement(statementId);
  }
  async function doReview() {
    "use server";
    await markStatementReviewed(statementId);
  }
  async function doDelete() {
    "use server";
    await deleteBankStatement(statementId);
    redirect("/statements");
  }

  const processLabel =
    statement.status === "PENDING"
      ? "Process statement (OCR)"
      : statement.status === "FAILED"
      ? "Retry extraction"
      : "Re-extract";

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/statements" className="hover:text-brand-navy flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Bank Imports
        </Link>
        <span>/</span>
        <Link href={`/clients/${statement.client.id}`} className="hover:text-brand-navy">
          {statement.client.businessName}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 shrink-0">
            <Landmark className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {statement.institution ?? (statement.kind === "CREDIT_CARD" ? "Credit-card statement" : "Bank statement")}
              {statement.accountNumberMasked ? ` · ${statement.accountNumberMasked}` : ""}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-sm">
              <StatusPill status={statement.status} />
              {statement.accountName && <span className="text-muted-foreground">{statement.accountName}</span>}
              {(statement.periodStart || statement.periodEnd) && (
                <span className="text-muted-foreground">
                  {statement.periodStart ? formatDate(statement.periodStart) : "—"} –{" "}
                  {statement.periodEnd ? formatDate(statement.periodEnd) : "—"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={fileUrl(statement.document.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-greyBorder bg-white px-3 py-1.5 text-sm hover:bg-brand-greyLight transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Source PDF
          </a>
          {hasTxns && (
            <>
              <a
                href={`/api/statements/${statement.id}/export?format=csv`}
                title="QuickBooks Online — bank-transaction CSV upload"
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                QuickBooks Online (CSV)
              </a>
              <a
                href={`/api/statements/${statement.id}/export?format=qbo`}
                title="QuickBooks Desktop — Web Connect .QBO (OFX) file"
                className="inline-flex items-center gap-1.5 rounded-md border border-green-600 bg-white px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                QuickBooks Desktop (.QBO)
              </a>
            </>
          )}
        </div>
      </div>

      {/* Failed banner */}
      {statement.status === "FAILED" && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Extraction failed</p>
            <p className="text-red-600/90">{statement.errorMessage ?? "Unknown error."}</p>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <form action={doProcess}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
          >
            {statement.status === "PENDING" ? <Play className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
            {processLabel}
          </button>
        </form>

        {hasTxns && !isReviewed && (
          <form action={doReview}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-greyBorder bg-white px-4 py-2 text-sm font-medium hover:bg-brand-greyLight transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark reviewed
            </button>
          </form>
        )}

        <form action={doDelete} className="ml-auto">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </form>
      </div>

      <p className="mb-5 text-xs text-muted-foreground">
        Processing runs the configured OCR engine on the source file. Large statements may take up to a
        minute. Extracted rows are editable below — correct anything, exclude noise rows, then export.
      </p>

      {/* Summary meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetaStat label="Opening balance" value={statement.openingBalance != null ? formatMoney(Number(statement.openingBalance), currency) : "—"} />
        <MetaStat label="Closing balance" value={statement.closingBalance != null ? formatMoney(Number(statement.closingBalance), currency) : "—"} />
        <MetaStat label="Currency" value={currency} />
        <MetaStat
          label="OCR engine"
          value={statement.extractionModel ? statement.extractionModel.replace(/^claude:/, "") : "—"}
          sub={statement.confidence != null ? `confidence ${(statement.confidence * 100).toFixed(0)}%` : undefined}
        />
      </div>

      {/* Review table */}
      <SectionCard title="Transactions" description="Edit, exclude rows, and save before exporting.">
        <StatementReviewTable
          statementId={statement.id}
          initialRows={rows}
          currency={currency}
          readOnly={isReviewed}
        />
        {isReviewed && (
          <p className="mt-3 text-xs text-muted-foreground">
            This statement is marked reviewed (read-only). Re-extract to make further changes.
          </p>
        )}
      </SectionCard>
    </div>
  );
}

function MetaStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-brand-greyBorder bg-white px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
