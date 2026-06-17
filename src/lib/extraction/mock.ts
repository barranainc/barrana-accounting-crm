import type { ExtractionInput, ExtractionProvider, ExtractionResult } from "./types";

// Deterministic sample extraction so the full upload → process → review → export flow
// works with no ANTHROPIC_API_KEY. Selected automatically when no key is present;
// force with EXTRACTION_PROVIDER=mock.
export class MockExtractionProvider implements ExtractionProvider {
  readonly name = "mock";

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const kind = input.kindHint ?? "BANK";
    return {
      statementType: kind,
      institution: "Mock Bank of Canada",
      accountName: kind === "CREDIT_CARD" ? "Business Visa" : "Business Chequing",
      accountNumberMasked: "••1234",
      currency: "CAD",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      openingBalance: 10000,
      closingBalance: 9123.45,
      confidence: 0.5,
      transactions: [
        { postedDate: "2026-05-03", description: "PAYROLL DEPOSIT - ACME CORP", amount: 4200.0, direction: "CREDIT", balance: 14200.0 },
        { postedDate: "2026-05-05", description: "RENT - WESTSIDE PROPERTIES", amount: 2200.0, direction: "DEBIT", balance: 12000.0 },
        { postedDate: "2026-05-09", description: "STAPLES #128 OFFICE SUPPLIES", amount: 176.55, direction: "DEBIT", balance: 11823.45 },
        { postedDate: "2026-05-15", description: "INTERAC E-TRANSFER FROM CLIENT", amount: 1500.0, direction: "CREDIT", balance: 13323.45 },
        { postedDate: "2026-05-22", description: "HYDRO ONE PRE-AUTH PAYMENT", amount: 320.0, direction: "DEBIT", balance: 13003.45 },
        { postedDate: "2026-05-28", description: "MONTHLY ACCOUNT FEE", amount: 30.0, direction: "DEBIT", balance: 12973.45 },
        { postedDate: "2026-05-31", description: "CHEQUE #104", amount: 3850.0, direction: "DEBIT", balance: 9123.45 },
      ],
      rawText: `MOCK extraction for ${input.fileName}. Set ANTHROPIC_API_KEY (and optionally EXTRACTION_PROVIDER=claude) for real OCR.`,
      model: "mock:fixture",
    };
  }
}
