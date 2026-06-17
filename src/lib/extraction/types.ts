// Statement OCR extraction — provider-agnostic types.
// The provider abstraction mirrors src/lib/{storage,email,signatures}: an interface
// plus an env-driven factory, so the OCR engine is swappable (and resellable).

export type StatementKind = "BANK" | "CREDIT_CARD";
export type TxnDirection = "DEBIT" | "CREDIT";

export interface ExtractedTransaction {
  /** Posted date normalised to ISO `YYYY-MM-DD`. */
  postedDate: string;
  description: string;
  /** Always a positive magnitude; `direction` carries the sign. */
  amount: number;
  direction: TxnDirection;
  /** Running balance after the transaction, if the statement shows one. */
  balance: number | null;
}

export interface ExtractedStatement {
  statementType: StatementKind;
  institution: string | null;
  accountName: string | null;
  /** Masked — last 4 digits only. Providers must never return a full account/PAN. */
  accountNumberMasked: string | null;
  currency: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  /** Provider's self-reported confidence, 0..1. */
  confidence: number | null;
  transactions: ExtractedTransaction[];
}

export interface ExtractionInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  /** Uploader's hint; the provider may override via `statementType`. */
  kindHint?: StatementKind;
}

export interface ExtractionResult extends ExtractedStatement {
  /** Best-effort raw text, when the provider exposes it. */
  rawText: string | null;
  /** Provider/model identifier used, e.g. `claude:claude-opus-4-8`. */
  model: string;
}

export interface ExtractionProvider {
  readonly name: string;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
