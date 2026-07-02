import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/permissions";
import { exportToQuickBooks } from "@/lib/quickbooks";
import type { CsvDateFormat, CsvLayout, QbExportFormat, QbExportInput } from "@/lib/quickbooks";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { NextResponse } from "next/server";

// GET /api/statements/[statementId]/export?format=csv|qbo[&layout=3col|4col][&datefmt=iso|us|uk]
// Streams a QuickBooks-importable file of the (non-excluded) transactions.
//   format=csv → QuickBooks Online bank-transaction upload
//   format=qbo → QuickBooks Desktop Web Connect (.QBO / OFX)
export async function GET(req: Request, { params }: { params: Promise<{ statementId: string }> }) {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  const { statementId } = await params;
  const url = new URL(req.url);
  const format: QbExportFormat = url.searchParams.get("format") === "qbo" ? "qbo" : "csv";
  const layout: CsvLayout = url.searchParams.get("layout") === "4col" ? "4col" : "3col";
  const dfParam = url.searchParams.get("datefmt");
  const csvDateFormat: CsvDateFormat = dfParam === "us" || dfParam === "uk" ? dfParam : "iso";

  const statement = await db.bankStatement.findUnique({
    where: { id: statementId },
    include: { transactions: { where: { excluded: false }, orderBy: { sortIndex: "asc" } } },
  });
  if (!statement) return new NextResponse("Not found", { status: 404 });

  const input: QbExportInput = {
    kind: statement.kind,
    institution: statement.institution,
    accountName: statement.accountName,
    accountNumberMasked: statement.accountNumberMasked,
    currency: statement.currency,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    openingBalance: statement.openingBalance != null ? Number(statement.openingBalance) : null,
    closingBalance: statement.closingBalance != null ? Number(statement.closingBalance) : null,
    transactions: statement.transactions.map((t) => ({
      id: t.id,
      postedDate: t.postedDate,
      description: t.description,
      amount: Number(t.amount),
      direction: t.direction,
      accountNumber: t.accountNumber,
      accountName: t.accountName,
      accountType: t.accountType,
      accountDetailType: t.accountDetailType,
    })),
  };

  const file = exportToQuickBooks(format, input, { csvLayout: layout, csvDateFormat });

  await createAuditEvent({
    action: AuditAction.STATEMENT_EXPORTED,
    actorUserId: session.user.id,
    clientId: statement.clientId,
    entityType: "BankStatement",
    entityId: statementId,
    metadata: { format, layout: format === "csv" ? layout : undefined, rows: input.transactions.length },
  });

  const contentType = file.mimeType === "text/csv" ? "text/csv; charset=utf-8" : file.mimeType;
  return new NextResponse(file.content, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
