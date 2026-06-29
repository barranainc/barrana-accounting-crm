// Consolidated CPA document checklist by client type (Canadian federal, 2025/2026 filing year).
// This is static reference data. When an admin creates a client and picks a client type,
// the matching checklist is shown in the form sidebar; the checked items are persisted as
// DocumentRequest rows for that client (see src/actions/clients.ts).
//
// Items flagged `optional: true` are conditional / threshold-based and start UNCHECKED so the
// admin opts in only when they apply. Everything else starts checked.

export type ClientTypeKey =
  | "CORPORATION"
  | "SOLE_PROPRIETOR"
  | "PARTNERSHIP"
  | "TRUST"
  | "NON_PROFIT"
  | "INDIVIDUAL";

export interface ChecklistItem {
  key: string;
  label: string;
  note?: string;
  optional?: boolean;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export const CLIENT_TYPE_LABELS: Record<ClientTypeKey, string> = {
  CORPORATION: "Corporation",
  SOLE_PROPRIETOR: "Sole Proprietor",
  PARTNERSHIP: "Partnership",
  TRUST: "Trust",
  NON_PROFIT: "Non-Profit",
  INDIVIDUAL: "Individual",
};

interface RawItem {
  label: string;
  note?: string;
  optional?: boolean;
}
interface RawCategory {
  category: string;
  items: RawItem[];
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// Build stable, unique keys from type + position + slug. Both client and server import this
// module, so the same keys are produced on both sides.
function build(type: ClientTypeKey, cats: RawCategory[]): ChecklistCategory[] {
  return cats.map((c, ci) => ({
    category: c.category,
    items: c.items.map((it, ii) => ({
      key: `${type}:${ci}:${ii}:${slugify(it.label)}`,
      label: it.label,
      note: it.note,
      optional: it.optional,
    })),
  }));
}

const CORPORATION: RawCategory[] = [
  {
    category: "Legal & Entity Documents",
    items: [
      { label: "Articles of Incorporation & Certificate of Incorporation (federal or provincial)" },
      { label: "Corporate bylaws and minute book (directors' resolutions, register of directors/officers)" },
      { label: "Shareholder register, share certificates, and shareholder agreement" },
      { label: "Business Number (BN) and all CRA program accounts (RC, RT, RP, RZ)" },
      { label: "Provincial annual return / corporate registry confirmation" },
      { label: "Prior-year T2 return and Notice of Assessment" },
      { label: "Reorganization, amalgamation, or share-transfer documents during the year", optional: true },
    ],
  },
  {
    category: "Financial Records",
    items: [
      { label: "Trial balance and general ledger" },
      { label: "Income statement, balance sheet, and prior-year comparatives" },
      { label: "All bank statements (full fiscal year) plus bank reconciliations" },
      { label: "Credit card and line-of-credit statements" },
      { label: "Loan agreements, amortization schedules, and lender year-end balances" },
      { label: "Accounts receivable and accounts payable aging" },
      { label: "Fixed asset additions/disposals with supporting invoices (for CCA)" },
      { label: "Year-end inventory count and valuation" },
      { label: "Accounting software backup (QuickBooks/Xero/Sage)" },
    ],
  },
  {
    category: "Tax & Compliance",
    items: [
      { label: "GST/HST returns and working papers" },
      { label: "Payroll: T4/T4 Summary, source-deduction remittances (PD7A), T4A for subcontractors" },
      { label: "T5 slips for dividends paid; directors' resolutions authorizing dividends" },
      { label: "Shareholder loan account details and any benefits conferred" },
      { label: "Vehicle logs and home-office support (if claimed)" },
      { label: "Corporate installment payment records" },
      { label: "T1134 - if the corporation owns foreign affiliates", optional: true },
      {
        label: "T1135 (Foreign Income Verification)",
        note: "Required if specified foreign property exceeds CAD $100,000 cost.",
        optional: true,
      },
      { label: "T5018 - if a construction business making payments to subcontractors", optional: true },
      {
        label: "UHT return (Underused Housing Tax)",
        note: "No longer applies for 2025 onward (eliminated in Budget 2025); only relevant when cleaning up 2022-2024 filings.",
        optional: true,
      },
    ],
  },
];

const SOLE_PROPRIETOR: RawCategory[] = [
  {
    category: "Business Information",
    items: [
      { label: "Business name registration / Master Business Licence" },
      {
        label: "Business Number and GST/HST account",
        note: "Registration mandatory once worldwide taxable revenue exceeds $30,000 over four consecutive quarters.",
      },
      { label: "Nature of business and commencement date" },
    ],
  },
  {
    category: "Financial Records",
    items: [
      { label: "Business bank statements (a dedicated account is strongly preferred)" },
      { label: "Business credit card statements" },
      { label: "Sales records and invoices issued" },
      { label: "Categorized expense receipts" },
      { label: "Vehicle log and motor-vehicle expense records" },
      { label: "Home-office details (square footage, utilities, rent or mortgage interest, property tax, insurance)" },
      { label: "Capital asset purchases (for CCA)" },
    ],
  },
  {
    category: "Tax & Compliance",
    items: [
      { label: "Prior-year T1 and Notice of Assessment" },
      { label: "GST/HST returns" },
      { label: "T4As / subcontractor payment records issued" },
      { label: "Payroll records and T4s (if there are employees)" },
      { label: "Installment payments made" },
      {
        label: "Form T2125 (Statement of Business Activities)",
        note: "Business income is reported on the personal T1 via Form T2125.",
      },
      {
        label: "T1135 (Foreign Income Verification)",
        note: "Required if specified foreign property exceeds CAD $100,000.",
        optional: true,
      },
    ],
  },
];

const PARTNERSHIP: RawCategory[] = [
  {
    category: "Legal & Business Information",
    items: [
      { label: "Partnership agreement" },
      { label: "Business name registration" },
      { label: "List of all partners with SINs/BNs and profit-sharing ratios" },
      { label: "Business Number and GST/HST account" },
    ],
  },
  {
    category: "Financial Records",
    items: [
      { label: "Partnership bank and credit card statements" },
      { label: "Revenue and expense records" },
      { label: "Each partner's capital account activity (contributions, draws, allocations)" },
      { label: "Asset listing and CCA schedule" },
      { label: "Loan agreements and year-end balances" },
    ],
  },
  {
    category: "Tax & Compliance",
    items: [
      { label: "Prior-year financial statements" },
      {
        label: "T5013 (Partnership Information Return)",
        note: "Generally required where absolute revenues + expenses exceed $2M, assets exceed $5M, or a partner is itself a corporation/partnership. Many small partnerships are exempt.",
        optional: true,
      },
      { label: "GST/HST returns" },
      { label: "Payroll records and T4s (if employees)" },
      { label: "Income allocation schedule to each partner (flows to each partner's T1 or T2)" },
      {
        label: "T1135 (Foreign Income Verification)",
        note: "Required if the partnership holds specified foreign property over CAD $100,000.",
        optional: true,
      },
    ],
  },
];

const TRUST: RawCategory[] = [
  {
    category: "Legal & Setup Documents",
    items: [
      { label: "Trust deed / trust agreement (or will, for a testamentary trust)" },
      { label: "Trust account number with CRA" },
      {
        label: "Schedule 15 beneficial-ownership data",
        note: "Names, addresses, dates of birth, SINs/TINs, and jurisdiction of residence for all trustees, beneficiaries, settlors, and any person with control over the trust.",
      },
      { label: "Date the trust was settled and trust type (testamentary, inter vivos, family, alter ego, etc.)" },
    ],
  },
  {
    category: "Financial Records",
    items: [
      { label: "Trust bank and investment statements" },
      { label: "Income records (interest, dividends, capital gains, rental, business)" },
      { label: "Records of distributions to beneficiaries" },
      { label: "Asset listing and valuations" },
      { label: "Expense records (trustee fees, accounting, legal)" },
    ],
  },
  {
    category: "Tax & Compliance",
    items: [
      { label: "Prior-year T3 return and Notice of Assessment" },
      { label: "T3/T5 slips received and T3 slips issued to beneficiaries" },
      { label: "Capital gain/loss details on dispositions" },
      {
        label: "T3 return + Schedule 15",
        note: `Under the enhanced rules (tax years ending Dec 31, 2023 onward), virtually all express Canadian-resident trusts must file annually even with no income or activity, unless a "listed trust" exemption applies. Deadline: 90 days after year-end.`,
      },
      {
        label: "Bare trust filing",
        note: "Not required for 2023, 2024, or 2025. Mandatory filing slated for years ending on/after Dec 31, 2026, subject to Bill C-15 - a watch item, not a current obligation.",
        optional: true,
      },
      {
        label: "Schedule 15 exemption review",
        note: "Common exemptions: total assets under $50,000 all year, trusts under three months old, registered charities, NPOs, certain professional/client trust accounts.",
        optional: true,
      },
    ],
  },
];

const NON_PROFIT: RawCategory[] = [
  {
    category: "Legal & Organizational Information",
    items: [
      { label: "Letters Patent / Articles of Incorporation" },
      { label: "Bylaws and constating documents" },
      {
        label: "Charitable registration number vs. NPO status",
        note: "Registered charities and non-charitable NPOs are taxed and reported differently - confirm which applies.",
      },
      { label: "Business Number and any program accounts" },
      { label: "Current board of directors list" },
      { label: "Mission / purpose documentation" },
    ],
  },
  {
    category: "Financial Records",
    items: [
      { label: "All bank statements" },
      { label: "Donation records and copies of official donation receipts issued" },
      { label: "Grant and funding agreements" },
      { label: "Revenue records (memberships, fundraising, events, program fees)" },
      { label: "Expense receipts and invoices" },
      { label: "Payroll records and T4s" },
      { label: "Investment statements" },
      { label: "Tracking of restricted vs. unrestricted funds" },
    ],
  },
  {
    category: "Tax & Compliance",
    items: [
      {
        label: "T1044 (NPO Information Return)",
        note: "For non-charitable NPOs that meet the filing thresholds.",
      },
      {
        label: "T3010 (Registered Charity Information Return)",
        note: "For registered charities; due within six months of year-end.",
      },
      { label: "T2 return", note: "Incorporated NPOs are technically required to file a T2 even though exempt from tax." },
      { label: "GST/HST returns (special rebate and calculation rules)" },
      { label: "T4A slips issued" },
      { label: "AGM minutes and member-approved financial statements" },
    ],
  },
];

const INDIVIDUAL: RawCategory[] = [
  {
    category: "Personal Information",
    items: [
      { label: "SIN and date of birth" },
      { label: "Prior-year T1 and Notice of Assessment" },
      { label: "Marital/common-law status and dependant details" },
      { label: "Direct deposit information" },
      { label: "CRA My Account access or authorization (AuthRep) - if representing them" },
    ],
  },
  {
    category: "Income Slips",
    items: [
      { label: "T4 (employment)" },
      { label: "T4A (pension, commissions, self-employment, other)" },
      { label: "T4A(P) CPP, T4A(OAS), T4E (EI)" },
      { label: "T4RSP / T4RIF" },
      { label: "T5 (investment income), T3 (trust income)" },
      { label: "T5008 (securities dispositions)" },
      { label: "T5013 (partnership income, if a partner)", optional: true },
      { label: "Rental income and expense records (Form T776)", optional: true },
      { label: "Self-employment records (Form T2125)", optional: true },
      { label: "Foreign income documentation and foreign tax paid", optional: true },
    ],
  },
  {
    category: "Deductions & Credits",
    items: [
      { label: "RRSP/FHSA contribution receipts" },
      { label: "Medical expense receipts" },
      { label: "Charitable and political donation receipts" },
      { label: "Childcare expense receipts" },
      { label: "Tuition (T2202) and student loan interest" },
      { label: "Union/professional dues" },
      { label: "Moving expense records", optional: true },
      { label: "Employment expenses with employer-signed T2200", optional: true },
      { label: "Support payments (spousal/child) with agreement", optional: true },
      { label: "Property tax / rent paid (for provincial credits)" },
      { label: "Disability Tax Credit certificate (T2201)", optional: true },
    ],
  },
  {
    category: "Foreign Reporting",
    items: [
      {
        label: "T1135 (Foreign Income Verification)",
        note: "Required if specified foreign property cost exceeds CAD $100,000 at any point in the year.",
        optional: true,
      },
    ],
  },
];

export const DOCUMENT_CHECKLISTS: Record<ClientTypeKey, ChecklistCategory[]> = {
  CORPORATION: build("CORPORATION", CORPORATION),
  SOLE_PROPRIETOR: build("SOLE_PROPRIETOR", SOLE_PROPRIETOR),
  PARTNERSHIP: build("PARTNERSHIP", PARTNERSHIP),
  TRUST: build("TRUST", TRUST),
  NON_PROFIT: build("NON_PROFIT", NON_PROFIT),
  INDIVIDUAL: build("INDIVIDUAL", INDIVIDUAL),
};

export function getChecklist(type: ClientTypeKey): ChecklistCategory[] {
  return DOCUMENT_CHECKLISTS[type] ?? [];
}

/** Initial checkbox state for a type: required items checked, conditional items unchecked. */
export function defaultCheckedMap(type: ClientTypeKey): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const cat of getChecklist(type)) {
    for (const it of cat.items) map[it.key] = !it.optional;
  }
  return map;
}

/** Server-side: resolve a set of checked keys back to persistable request rows. */
export function resolveChecklistKeys(
  type: ClientTypeKey,
  keys: string[]
): { title: string; category: string; note?: string }[] {
  const wanted = new Set(keys);
  const out: { title: string; category: string; note?: string }[] = [];
  for (const cat of getChecklist(type)) {
    for (const it of cat.items) {
      if (wanted.has(it.key)) out.push({ title: it.label, category: cat.category, note: it.note });
    }
  }
  return out;
}
