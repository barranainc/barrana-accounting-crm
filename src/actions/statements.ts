"use server";

import { db } from "@/lib/db";
import { assertStaff } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { storage } from "@/lib/storage";
import { extraction } from "@/lib/extraction";
import { uploadDocument } from "@/actions/documents";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { StatementKind, TxnDirection } from "@prisma/client";
import type { Readable } from "stream";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normaliseDirection(value: string | null | undefined): TxnDirection {
  return value === "CREDIT" ? "CREDIT" : "DEBIT";
}

// ─── Upload ───────────────────────────────────────────────────────────────────

interface CreateStatementOpts {
  clientId: string;
  kind: StatementKind;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Uploads the source PDF (reusing the Document pipeline — storage, version chain,
 * audit) and creates a PENDING BankStatement anchored to it.
 */
export async function createBankStatement(opts: CreateStatementOpts) {
  await assertStaff();

  const title = opts.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") || "Statement";

  const doc = await uploadDocument({
    clientId: opts.clientId,
    title,
    documentType: "BANK_STATEMENT",
    category: "BANK_STATEMENT",
    visibility: "INTERNAL",
    fileBuffer: opts.fileBuffer,
    fileName: opts.fileName,
    mimeType: opts.mimeType,
    fileSize: opts.fileSize,
  });

  const session = await assertStaff();
  const statement = await db.bankStatement.create({
    data: {
      clientId: opts.clientId,
      documentId: doc.id,
      uploadedById: session.user.id,
      kind: opts.kind,
      status: "PENDING",
    },
  });

  await createAuditEvent({
    action: AuditAction.STATEMENT_UPLOADED,
    actorUserId: session.user.id,
    clientId: opts.clientId,
    entityType: "BankStatement",
    entityId: statement.id,
    metadata: { fileName: opts.fileName, kind: opts.kind },
  });

  revalidatePath("/statements");
  return { statementId: statement.id, documentId: doc.id };
}

// ─── Process (OCR extraction) ───────────────────────────────────────────────────

export async function processBankStatement(statementId: string) {
  const session = await assertStaff();

  const statement = await db.bankStatement.findUniqueOrThrow({
    where: { id: statementId },
    include: { document: true },
  });

  await db.bankStatement.update({
    where: { id: statementId },
    data: { status: "PROCESSING", errorMessage: null },
  });
  revalidatePath(`/statements/${statementId}`);

  try {
    const file = await storage.get(statement.document.storagePath);
    const buffer = await streamToBuffer(file.stream);

    const result = await extraction.extract({
      buffer,
      mimeType: statement.document.mimeType,
      fileName: statement.document.fileName,
      kindHint: statement.kind,
    });

    await db.$transaction(async (tx) => {
      // Re-runs replace the prior extraction wholesale.
      await tx.statementTransaction.deleteMany({ where: { statementId } });

      await tx.bankStatement.update({
        where: { id: statementId },
        data: {
          status: "EXTRACTED",
          kind: result.statementType ?? statement.kind,
          institution: result.institution,
          accountName: result.accountName,
          accountNumberMasked: result.accountNumberMasked,
          currency: result.currency ?? "CAD",
          periodStart: parseDate(result.periodStart),
          periodEnd: parseDate(result.periodEnd),
          openingBalance: result.openingBalance ?? null,
          closingBalance: result.closingBalance ?? null,
          confidence: result.confidence ?? null,
          extractionModel: result.model,
          rawText: result.rawText,
          errorMessage: null,
          transactions: {
            create: result.transactions.map((t, i) => ({
              postedDate: parseDate(t.postedDate) ?? new Date(),
              description: t.description ?? "",
              amount: Math.abs(Number(t.amount) || 0),
              direction: normaliseDirection(t.direction),
              balance: t.balance ?? null,
              sortIndex: i,
            })),
          },
        },
      });

      // Mirror onto the Document's OCR placeholder fields for cross-app visibility.
      await tx.document.update({
        where: { id: statement.documentId },
        data: {
          extractionStatus: "EXTRACTED",
          extractionConfidence: result.confidence ?? null,
          ocrText: result.rawText,
          extractedData: result as unknown as Prisma.InputJsonValue,
        },
      });
    });

    await createAuditEvent({
      action: AuditAction.STATEMENT_EXTRACTED,
      actorUserId: session.user.id,
      clientId: statement.clientId,
      entityType: "BankStatement",
      entityId: statementId,
      metadata: { model: result.model, transactionCount: result.transactions.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.bankStatement.update({
      where: { id: statementId },
      data: { status: "FAILED", errorMessage: message },
    });
    await db.document.update({
      where: { id: statement.documentId },
      data: { extractionStatus: "FAILED" },
    });
    await createAuditEvent({
      action: AuditAction.STATEMENT_EXTRACTION_FAILED,
      actorUserId: session.user.id,
      clientId: statement.clientId,
      entityType: "BankStatement",
      entityId: statementId,
      metadata: { error: message },
    });
    revalidatePath(`/statements/${statementId}`);
    throw new Error(`Extraction failed: ${message}`);
  }

  revalidatePath(`/statements/${statementId}`);
  revalidatePath("/statements");
}

// ─── Review edits ───────────────────────────────────────────────────────────────

interface EditableTransaction {
  id: string;
  postedDate: string;
  description: string;
  amount: number;
  direction: TxnDirection;
  excluded: boolean;
}

/** Bulk-save the review table — edits + exclude toggles for every row at once. */
export async function saveStatementTransactions(statementId: string, rows: EditableTransaction[]) {
  const session = await assertStaff();
  const statement = await db.bankStatement.findUniqueOrThrow({
    where: { id: statementId },
    select: { clientId: true },
  });

  await db.$transaction(
    rows.map((r) =>
      db.statementTransaction.update({
        where: { id: r.id },
        data: {
          postedDate: parseDate(r.postedDate) ?? undefined,
          description: r.description,
          amount: Math.abs(Number(r.amount) || 0),
          direction: normaliseDirection(r.direction),
          excluded: !!r.excluded,
        },
      })
    )
  );

  await createAuditEvent({
    action: AuditAction.STATEMENT_TRANSACTIONS_UPDATED,
    actorUserId: session.user.id,
    clientId: statement.clientId,
    entityType: "BankStatement",
    entityId: statementId,
    metadata: { rowCount: rows.length },
  });

  revalidatePath(`/statements/${statementId}`);
}

export async function toggleTransactionExcluded(transactionId: string) {
  await assertStaff();
  const txn = await db.statementTransaction.findUniqueOrThrow({
    where: { id: transactionId },
    select: { excluded: true, statementId: true },
  });
  await db.statementTransaction.update({
    where: { id: transactionId },
    data: { excluded: !txn.excluded },
  });
  revalidatePath(`/statements/${txn.statementId}`);
}

export async function markStatementReviewed(statementId: string) {
  const session = await assertStaff();
  const statement = await db.bankStatement.update({
    where: { id: statementId },
    data: { status: "REVIEWED" },
  });
  await createAuditEvent({
    action: AuditAction.STATEMENT_REVIEWED,
    actorUserId: session.user.id,
    clientId: statement.clientId,
    entityType: "BankStatement",
    entityId: statementId,
  });
  revalidatePath(`/statements/${statementId}`);
  revalidatePath("/statements");
}

export async function deleteBankStatement(statementId: string) {
  const session = await assertStaff();
  const statement = await db.bankStatement.findUniqueOrThrow({
    where: { id: statementId },
    include: { document: true },
  });

  // Deleting the Document cascades to BankStatement → StatementTransaction.
  await storage.delete(statement.document.storagePath).catch(() => {});
  await db.document.delete({ where: { id: statement.documentId } });

  await createAuditEvent({
    action: AuditAction.STATEMENT_REVIEWED,
    actorUserId: session.user.id,
    clientId: statement.clientId,
    entityType: "BankStatement",
    entityId: statementId,
    metadata: { deleted: true },
  });

  revalidatePath("/statements");
  return { ok: true };
}
