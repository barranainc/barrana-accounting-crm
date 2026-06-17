import Anthropic from "@anthropic-ai/sdk";
import type {
  ExtractedStatement,
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
} from "./types";

// Default to the most capable model for accuracy on dense financial tables.
// Override with EXTRACTION_MODEL (e.g. claude-sonnet-4-6 / claude-haiku-4-5) for
// cheaper high-volume runs. See README pricing notes.
const MODEL = process.env.EXTRACTION_MODEL ?? "claude-opus-4-8";

const SYSTEM_PROMPT = `You are an expert accounting data-extraction engine for a CPA firm. You read scanned or digital bank and credit-card statements and extract EVERY transaction with perfect fidelity for import into QuickBooks.

Rules:
- Extract every transaction line, in the order it appears. Do not summarise, merge, or skip rows — include fees, interest, service charges, and cheques.
- "amount" is ALWAYS a positive number. Use "direction" to indicate flow: DEBIT for money leaving the account (withdrawals, purchases, card charges, fees), CREDIT for money entering (deposits, payments received, refunds, interest earned).
- Normalise every date to YYYY-MM-DD. Statements often omit the year on each line — infer it from the statement period, handling December→January year rollovers.
- Mask account numbers to the last 4 digits only. Never output a full account or card number.
- If a value is not present on the statement, return null — never guess.
- Capture opening/closing balances and the statement period when shown.
Call the record_statement tool exactly once with the complete result.`;

// JSON Schema for the forced tool call. Forced tool use (tool_choice) is the most
// version-robust way to get a validated object back — the tool_use `input` is already
// parsed, no text-parsing needed.
const STATEMENT_TOOL = {
  name: "record_statement",
  description:
    "Record every transaction and the header details extracted from a bank or credit-card statement.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      statementType: {
        type: "string",
        enum: ["BANK", "CREDIT_CARD"],
        description: "Whether this is a bank account or credit-card statement.",
      },
      institution: {
        type: ["string", "null"],
        description: "Financial institution name, e.g. 'TD Canada Trust'.",
      },
      accountName: {
        type: ["string", "null"],
        description: "Account product name, e.g. 'Business Chequing'.",
      },
      accountNumberMasked: {
        type: ["string", "null"],
        description: "Masked account number — last 4 digits only, never the full number.",
      },
      currency: {
        type: ["string", "null"],
        description: "ISO 4217 code, e.g. 'CAD' or 'USD'. Use 'CAD' for Canadian statements when unspecified.",
      },
      periodStart: { type: ["string", "null"], description: "Statement period start as YYYY-MM-DD." },
      periodEnd: { type: ["string", "null"], description: "Statement period end as YYYY-MM-DD." },
      openingBalance: { type: ["number", "null"], description: "Opening balance for the period." },
      closingBalance: { type: ["number", "null"], description: "Closing balance for the period." },
      confidence: {
        type: ["number", "null"],
        description: "Your confidence in the extraction accuracy, from 0 to 1.",
      },
      transactions: {
        type: "array",
        description: "Every transaction line on the statement, in statement order.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            postedDate: {
              type: "string",
              description: "Transaction date as YYYY-MM-DD. Infer the year from the statement period.",
            },
            description: { type: "string", description: "The full transaction description / payee text." },
            amount: {
              type: "number",
              description: "Transaction amount as a POSITIVE number. The sign is carried by 'direction'.",
            },
            direction: {
              type: "string",
              enum: ["DEBIT", "CREDIT"],
              description:
                "DEBIT = money out (withdrawal, purchase, charge, fee). CREDIT = money in (deposit, payment, refund, interest).",
            },
            balance: {
              type: ["number", "null"],
              description: "Running balance after this transaction, if shown.",
            },
          },
          required: ["postedDate", "description", "amount", "direction", "balance"],
        },
      },
    },
    required: [
      "statementType",
      "institution",
      "accountName",
      "accountNumberMasked",
      "currency",
      "periodStart",
      "periodEnd",
      "openingBalance",
      "closingBalance",
      "confidence",
      "transactions",
    ],
  },
};

function buildSourceBlock(input: ExtractionInput) {
  const base64 = input.buffer.toString("base64");
  if (input.mimeType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };
  }
  if (input.mimeType.startsWith("image/")) {
    return {
      type: "image",
      source: { type: "base64", media_type: input.mimeType, data: base64 },
    };
  }
  throw new Error(
    `Unsupported statement file type for OCR: ${input.mimeType}. Upload a PDF or image.`
  );
}

export class ClaudeExtractionProvider implements ExtractionProvider {
  readonly name = "claude";
  private client: Anthropic | null = null;

  // Lazy — so importing the module (and the factory singleton) never throws when no
  // key is configured; only an actual extraction without a key errors, with guidance.
  private getClient(): Anthropic {
    if (!this.client) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error(
          "ANTHROPIC_API_KEY is not set. Add it to .env, or set EXTRACTION_PROVIDER=mock to use sample data."
        );
      }
      this.client = new Anthropic();
    }
    return this.client;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const sourceBlock = buildSourceBlock(input);
    const kindHint = input.kindHint
      ? `The uploader tagged this as a ${input.kindHint} statement.`
      : "";

    const message = await this.getClient().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [STATEMENT_TOOL as any],
      tool_choice: { type: "tool", name: "record_statement" },
      messages: [
        {
          role: "user",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: [sourceBlock as any, { type: "text", text: `Extract this statement in full. ${kindHint}` }],
        },
      ],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude did not return structured statement data.");
    }
    const data = toolUse.input as ExtractedStatement;

    return {
      ...data,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      rawText: null,
      model: `claude:${MODEL}`,
    };
  }
}
