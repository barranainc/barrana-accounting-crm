import type { QbExportFile, QbExportInput } from "./types";
import { alnum, money, ofxDate, ofxDateTime, sanitizeDescription, sgmlEscape, slugify, toDate } from "./format";

// Generates an OFX 1.0.2 (SGML) "Web Connect" .QBO file — the native bank-feed
// import format for QuickBooks Desktop (File → Utilities → Import → Web Connect).
//
// Notes:
// - OFX 1.x is SGML: leaf tags are NOT closed (`<CODE>0`), only aggregates are.
// - Bank vs credit-card statements use different message sets (STMTRS / CCSTMTRS).
// - FITID is the dedupe key — we use the stable DB row id so re-importing the same
//   statement doesn't create duplicates in QuickBooks.
// - ORG/FID/INTU.BID are placeholders; on import QuickBooks will ask which account
//   to use if it doesn't recognise the FI, then import the transactions normally.
const FID = "1001";
const BID = "1001";
const BANKID = "000000000";

export function toQuickBooksOfx(input: QbExportInput): QbExportFile {
  const isCreditCard = input.kind === "CREDIT_CARD";
  const currency = (input.currency || "CAD").toUpperCase();

  // Drop zero-amount rows.
  const txns = input.transactions.filter((t) => Math.abs(Number(t.amount) || 0) >= 0.005);

  const times = txns.map((t) => toDate(t.postedDate).getTime()).filter((n) => !Number.isNaN(n));
  const dtStart = input.periodStart ?? (times.length ? new Date(Math.min(...times)) : new Date());
  const dtEnd = input.periodEnd ?? (times.length ? new Date(Math.max(...times)) : new Date());

  const acctId = alnum(input.accountNumberMasked || "", "ACCT0001");
  const org = sgmlEscape(input.institution || "Bank");

  // Ledger balance: prefer the statement's closing balance, else derive it.
  let closing = input.closingBalance;
  if (closing == null) {
    const opening = input.openingBalance ?? 0;
    const net = txns.reduce(
      (s, t) => s + (t.direction === "CREDIT" ? Math.abs(t.amount) : -Math.abs(t.amount)),
      0
    );
    closing = opening + net;
  }

  const stmttrn = txns
    .map((t, i) => {
      const amt = Math.abs(Number(t.amount) || 0);
      const signed = t.direction === "DEBIT" ? -amt : amt;
      const fitid = alnum(t.id || "", "") || `${ofxDate(t.postedDate)}${i}${Math.round(amt * 100)}`;
      const desc = sanitizeDescription(t.description);
      return [
        "<STMTTRN>",
        `<TRNTYPE>${t.direction}`,
        `<DTPOSTED>${ofxDate(t.postedDate)}`,
        `<TRNAMT>${money(signed)}`,
        `<FITID>${fitid}`,
        `<NAME>${sgmlEscape(desc.slice(0, 32))}`, // OFX NAME is capped at 32 chars
        `<MEMO>${sgmlEscape(desc)}`, // full description in MEMO
        "</STMTTRN>",
      ].join("\r\n");
    })
    .join("\r\n");

  const header = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "COMPRESSION:NONE",
    "OLDFILEUID:NONE",
    "NEWFILEUID:NONE",
    "",
  ].join("\r\n");

  const signon = [
    "<SIGNONMSGSRSV1>",
    "<SONRS>",
    "<STATUS>",
    "<CODE>0",
    "<SEVERITY>INFO",
    "</STATUS>",
    `<DTSERVER>${ofxDateTime(dtEnd)}`,
    "<LANGUAGE>ENG",
    "<FI>",
    `<ORG>${org}`,
    `<FID>${FID}`,
    "</FI>",
    `<INTU.BID>${BID}`,
    "</SONRS>",
    "</SIGNONMSGSRSV1>",
  ].join("\r\n");

  const tranList = [
    "<BANKTRANLIST>",
    `<DTSTART>${ofxDate(dtStart)}`,
    `<DTEND>${ofxDate(dtEnd)}`,
    stmttrn,
    "</BANKTRANLIST>",
  ].join("\r\n");

  const ledgerBal = ["<LEDGERBAL>", `<BALAMT>${money(closing)}`, `<DTASOF>${ofxDate(dtEnd)}`, "</LEDGERBAL>"].join("\r\n");

  const body = isCreditCard
    ? [
        "<CREDITCARDMSGSRSV1>",
        "<CCSTMTTRNRS>",
        "<TRNUID>1",
        "<STATUS>",
        "<CODE>0",
        "<SEVERITY>INFO",
        "</STATUS>",
        "<CCSTMTRS>",
        `<CURDEF>${currency}`,
        "<CCACCTFROM>",
        `<ACCTID>${acctId}`,
        "</CCACCTFROM>",
        tranList,
        ledgerBal,
        "</CCSTMTRS>",
        "</CCSTMTTRNRS>",
        "</CREDITCARDMSGSRSV1>",
      ].join("\r\n")
    : [
        "<BANKMSGSRSV1>",
        "<STMTTRNRS>",
        "<TRNUID>1",
        "<STATUS>",
        "<CODE>0",
        "<SEVERITY>INFO",
        "</STATUS>",
        "<STMTRS>",
        `<CURDEF>${currency}`,
        "<BANKACCTFROM>",
        `<BANKID>${BANKID}`,
        `<ACCTID>${acctId}`,
        "<ACCTTYPE>CHECKING",
        "</BANKACCTFROM>",
        tranList,
        ledgerBal,
        "</STMTRS>",
        "</STMTTRNRS>",
        "</BANKMSGSRSV1>",
      ].join("\r\n");

  const content = [header, "<OFX>", signon, body, "</OFX>", ""].join("\r\n");
  const name = input.accountName || input.institution || "statement";
  return {
    filename: `quickbooks-${slugify(name)}.qbo`,
    mimeType: "application/vnd.intu.QBO",
    content,
  };
}
