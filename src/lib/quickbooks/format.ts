// Shared formatting helpers for the QuickBooks exporters.

import type { CsvDateFormat } from "./types";

export function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

// Use UTC getters — postedDate is stored at UTC midnight, so local getters could
// shift the calendar day by one.
function parts(d: Date | string): { y: string; m: string; day: string } | null {
  const dt = toDate(d);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    y: String(dt.getUTCFullYear()),
    m: String(dt.getUTCMonth() + 1).padStart(2, "0"),
    day: String(dt.getUTCDate()).padStart(2, "0"),
  };
}

export function formatCsvDate(d: Date | string, fmt: CsvDateFormat): string {
  const p = parts(d);
  if (!p) return typeof d === "string" ? d : "";
  if (fmt === "us") return `${p.m}/${p.day}/${p.y}`;
  if (fmt === "uk") return `${p.day}/${p.m}/${p.y}`;
  return `${p.y}-${p.m}-${p.day}`; // iso (default)
}

export function ofxDate(d: Date | string): string {
  const p = parts(d);
  return p ? `${p.y}${p.m}${p.day}` : "";
}

export function ofxDateTime(d: Date | string): string {
  const p = parts(d);
  return p ? `${p.y}${p.m}${p.day}120000` : "";
}

export function money(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

// QuickBooks dislikes multi-line cells — collapse all whitespace to single spaces.
export function sanitizeDescription(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

// RFC-4180 CSV cell escaping.
export function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// OFX 1.x is SGML — escape the markup-significant characters.
export function sgmlEscape(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Keep only alphanumerics (for OFX ACCTID / FITID); fall back if empty.
export function alnum(s: string, fallback: string): string {
  const cleaned = (s ?? "").replace(/[^A-Za-z0-9]/g, "");
  return cleaned || fallback;
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "statement";
}
