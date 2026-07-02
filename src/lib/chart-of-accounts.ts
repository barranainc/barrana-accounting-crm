// Barrana Accounting Services - Chart of Accounts (QuickBooks "Account List").
// Auto-generated from the exported account list; names kept EXACTLY as in QuickBooks
// so categorised transactions import back cleanly. 91 accounts.

export interface ChartAccount {
  number: string; // "" for QuickBooks system/default accounts
  name: string;
  type: string;
  detailType: string;
}

export const CHART_OF_ACCOUNTS: ChartAccount[] = [
  { number: "1000", name: "Cash – Operating", type: "Bank", detailType: "Cash on hand" },
  { number: "1001", name: "TD Bank Account - 2429", type: "Bank", detailType: "Chequing" },
  { number: "1010", name: "Cash – Trust Account", type: "Bank", detailType: "Chequing" },
  { number: "1020", name: "Petty Cash", type: "Bank", detailType: "Cash on hand" },
  { number: "1100", name: "Accounts Receivable – Clients", type: "Accounts receivable (A/R)", detailType: "Accounts Receivable (A/R)" },
  { number: "1300", name: "Prepaid Expenses", type: "Other Current Assets", detailType: "Prepaid Expenses" },
  { number: "", name: "Inventory Asset", type: "Other Current Assets", detailType: "Inventory" },
  { number: "", name: "Uncategorized Asset", type: "Other Current Assets", detailType: "Other current assets" },
  { number: "", name: "Uncategorized Asset-1", type: "Other Current Assets", detailType: "Other current assets" },
  { number: "", name: "Undeposited Funds", type: "Other Current Assets", detailType: "Undeposited Funds" },
  { number: "1200", name: "Work in Progress (WIP)", type: "Property, plant and equipment", detailType: "Other fixed assets" },
  { number: "1400", name: "Office Furniture", type: "Property, plant and equipment", detailType: "Furniture and Fixtures" },
  { number: "1410", name: "Computer Equipment", type: "Property, plant and equipment", detailType: "Machinery and equipment" },
  { number: "1420", name: "Accumulated Depreciation – Furniture", type: "Property, plant and equipment", detailType: "Accumulated Depreciation" },
  { number: "1430", name: "Accumulated Depreciation – Computers", type: "Property, plant and equipment", detailType: "Accumulated Depreciation" },
  { number: "1600", name: "Intangible Assets – Software Licenses", type: "Property, plant and equipment", detailType: "Depletable Assets" },
  { number: "1500", name: "Security Deposits", type: "Long-term Assets", detailType: "Security Deposits" },
  { number: "2000", name: "Accounts Payable", type: "Accounts payable (A/P)", detailType: "Accounts Payable (A/P)" },
  { number: "2001", name: "TD Visa Credit Card-2915", type: "Credit Card", detailType: "Credit Card" },
  { number: "1110", name: "Allowance for Doubtful Accounts", type: "Other Current Liabilities", detailType: "Current Liabilities" },
  { number: "2010", name: "GST/HST Payable", type: "Other Current Liabilities", detailType: "GST/HST Payable" },
  { number: "2011", name: "GST/HST Suspense", type: "Other Current Liabilities", detailType: "GST/HST Suspense" },
  { number: "2020", name: "Accrued Payroll", type: "Other Current Liabilities", detailType: "Current Liabilities" },
  { number: "2030", name: "Accrued Vacation Pay", type: "Other Current Liabilities", detailType: "Current Liabilities" },
  { number: "2040", name: "Payroll Deductions Payable", type: "Other Current Liabilities", detailType: "Current Liabilities" },
  { number: "2060", name: "Corporate Tax Payable", type: "Other Current Liabilities", detailType: "Current Tax Liability" },
  { number: "2100", name: "Unearned Revenue (Client Retainers)", type: "Other Current Liabilities", detailType: "Prepaid Expenses Payable" },
  { number: "2200", name: "Loans Payable – Short Term", type: "Other Current Liabilities", detailType: "Short term borrowings from related parties" },
  { number: "", name: "Deferred Revenue", type: "Other Current Liabilities", detailType: "Deferred Revenue" },
  { number: "2300", name: "Loans Payable – Long Term", type: "Long-term Liabilities", detailType: "Bank loans" },
  { number: "3000", name: "Common Shares – Class A", type: "Equity", detailType: "Common Stock" },
  { number: "3200", name: "Dividends Declared", type: "Equity", detailType: "Partner's Equity" },
  { number: "3300", name: "Shareholder Loan Payable", type: "Equity", detailType: "Partner Distributions" },
  { number: "3310", name: "Due to Shareholder 1", type: "Equity", detailType: "Partner's Equity" },
  { number: "3320", name: "Due to Sahreholder 2", type: "Equity", detailType: "Partner's Equity" },
  { number: "3330", name: "Due to Sahreholder 3", type: "Equity", detailType: "Partner's Equity" },
  { number: "", name: "Opening Balance Equity", type: "Equity", detailType: "Opening Balance Equity" },
  { number: "", name: "Retained Earnings", type: "Equity", detailType: "Retained Earnings" },
  { number: "4000", name: "Accounting Services", type: "Income", detailType: "Service/Fee Income" },
  { number: "4001", name: "Accounting Services:Accounting Fees", type: "Income", detailType: "Service/Fee Income" },
  { number: "4010", name: "Accounting Services:Bookkeeping Revenue", type: "Income", detailType: "Service/Fee Income" },
  { number: "4020", name: "Accounting Services:Tax Preparation Revenue", type: "Income", detailType: "Service/Fee Income" },
  { number: "4030", name: "Accounting Services:Advisory & Consulting Revenue", type: "Income", detailType: "Service/Fee Income" },
  { number: "4040", name: "Accounting Services:Audit & Assurance Revenue", type: "Income", detailType: "Service/Fee Income" },
  { number: "4050", name: "Accounting Services:Payroll Service Revenue", type: "Income", detailType: "Service/Fee Income" },
  { number: "4100", name: "Late Fee Income", type: "Income", detailType: "Other Primary Income" },
  { number: "4200", name: "Miscellaneous Income", type: "Income", detailType: "Other Primary Income" },
  { number: "4500", name: "AI Automation", type: "Income", detailType: "Sales of Product Income" },
  { number: "4510", name: "AI Automation:AI Automation Project", type: "Income", detailType: "Sales of Product Income" },
  { number: "4520", name: "AI Automation:AI Automation Services", type: "Income", detailType: "Service/Fee Income" },
  { number: "4530", name: "AI Automation:Social Media Service", type: "Income", detailType: "Sales of Product Income" },
  { number: "4540", name: "AI Automation:Web Development Service", type: "Income", detailType: "Sales of Product Income" },
  { number: "", name: "Billable Expense Income", type: "Income", detailType: "Service/Fee Income" },
  { number: "", name: "Sales of Product Income", type: "Income", detailType: "Sales of Product Income" },
  { number: "", name: "Services", type: "Income", detailType: "Service/Fee Income" },
  { number: "", name: "Unapplied Cash Payment Income", type: "Income", detailType: "Unapplied Cash Payment Income" },
  { number: "", name: "Uncategorized Income", type: "Income", detailType: "Service/Fee Income" },
  { number: "", name: "Cost of Goods Sold", type: "Cost of Goods Sold", detailType: "Supplies and materials - COGS" },
  { number: "5000", name: "Subcontractor Fees", type: "Expenses", detailType: "Office/General Administrative Expenses" },
  { number: "5010", name: "Direct Labor – Billable Staff", type: "Expenses", detailType: "Payroll Expenses" },
  { number: "5011", name: "Outsource AI Services", type: "Expenses", detailType: "Cost of Labour" },
  { number: "5020", name: "Software Costs – Client Deliverables", type: "Expenses", detailType: "Office/General Administrative Expenses" },
  { number: "5030", name: "Outsourced Tax Preparation", type: "Expenses", detailType: "Other Miscellaneous Service Cost" },
  { number: "5040", name: "Outsourced Bookkeeping Services", type: "Expenses", detailType: "Other Miscellaneous Service Cost" },
  { number: "6000", name: "Rent Expense", type: "Expenses", detailType: "Rent or Lease of Buildings" },
  { number: "6010", name: "Utilities", type: "Expenses", detailType: "Utilities" },
  { number: "6020", name: "Office Supplies", type: "Expenses", detailType: "Supplies" },
  { number: "6030", name: "Telephone & Internet", type: "Expenses", detailType: "Office/General Administrative Expenses" },
  { number: "6040", name: "Insurance – General Liability", type: "Expenses", detailType: "Insurance" },
  { number: "6050", name: "Insurance – Professional Liability", type: "Expenses", detailType: "Insurance" },
  { number: "6100", name: "Software Subscriptions", type: "Expenses", detailType: "Dues and Subscriptions" },
  { number: "6110", name: "Cloud Storage", type: "Expenses", detailType: "Dues and Subscriptions" },
  { number: "6120", name: "IT Support & Maintenance", type: "Expenses", detailType: "Dues and Subscriptions" },
  { number: "6200", name: "Advertising", type: "Expenses", detailType: "Advertising/Promotional" },
  { number: "6201", name: "Bank Charges", type: "Expenses", detailType: "Bank charges" },
  { number: "6210", name: "Website Hosting & Maintenance", type: "Expenses", detailType: "Dues and Subscriptions" },
  { number: "6220", name: "Client Gifts & Events", type: "Expenses", detailType: "Advertising/Promotional" },
  { number: "6300", name: "Professional Fees (Legal, Accounting)", type: "Expenses", detailType: "Legal and professional fees" },
  { number: "6310", name: "Licensing & Memberships", type: "Expenses", detailType: "Legal and professional fees" },
  { number: "6320", name: "Continuing Professional Education (CPE)", type: "Expenses", detailType: "Dues and Subscriptions" },
  { number: "6400", name: "Salaries – Admin Staff", type: "Expenses", detailType: "Payroll Expenses" },
  { number: "6410", name: "Payroll Taxes", type: "Expenses", detailType: "Payroll Expenses" },
  { number: "6420", name: "Employee Benefits", type: "Expenses", detailType: "Payroll Expenses" },
  { number: "6430", name: "Recruitment Costs", type: "Expenses", detailType: "Legal and professional fees" },
  { number: "6500", name: "Travel", type: "Expenses", detailType: "Travel" },
  { number: "6510", name: "Meals & Entertainment", type: "Expenses", detailType: "Meals and entertainment" },
  { number: "", name: "Purchases", type: "Expenses", detailType: "Supplies" },
  { number: "", name: "Unapplied Cash Bill Payment Expense", type: "Expenses", detailType: "Unapplied Cash Bill Payment Expense" },
  { number: "", name: "Uncategorized Expense", type: "Expenses", detailType: "Other Miscellaneous Service Cost" },
  { number: "6600", name: "Depreciation – Furniture", type: "Other Expense", detailType: "Depreciation" },
  { number: "6610", name: "Depreciation – Computers", type: "Other Expense", detailType: "Depreciation" },
];

export const ACCOUNT_NAMES: string[] = CHART_OF_ACCOUNTS.map((a) => a.name);
export const ACCOUNT_NUMBERS: string[] = CHART_OF_ACCOUNTS.filter((a) => a.number).map((a) => a.number);

export function accountByName(name: string): ChartAccount | undefined {
  return CHART_OF_ACCOUNTS.find((a) => a.name === name);
}

export function accountByNumber(number: string): ChartAccount | undefined {
  return CHART_OF_ACCOUNTS.find((a) => a.number === number);
}
