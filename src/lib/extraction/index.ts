import { ClaudeExtractionProvider } from "./claude";
import { MockExtractionProvider } from "./mock";
import type { ExtractionProvider } from "./types";

// Env-driven factory (same pattern as storage/email/signatures).
// EXTRACTION_PROVIDER = "claude" | "mock". When unset, auto-selects "claude" if an
// ANTHROPIC_API_KEY is present, otherwise "mock" — so the feature runs out of the box.
function createExtractionProvider(): ExtractionProvider {
  const explicit = process.env.EXTRACTION_PROVIDER?.trim().toLowerCase();
  const provider = explicit || (process.env.ANTHROPIC_API_KEY ? "claude" : "mock");

  switch (provider) {
    case "claude":
      return new ClaudeExtractionProvider();
    case "mock":
      return new MockExtractionProvider();
    default:
      console.warn(`[extraction] Unknown EXTRACTION_PROVIDER "${provider}", falling back to mock.`);
      return new MockExtractionProvider();
  }
}

export const extraction: ExtractionProvider = createExtractionProvider();

export type {
  ExtractedStatement,
  ExtractedTransaction,
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
  StatementKind,
  TxnDirection,
} from "./types";
