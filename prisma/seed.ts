/**
 * Seed script for Barrana Accounting CRM demo data.
 * Run with: npm run db:seed
 *
 * Creates:
 *  - 3 staff users (super admin, CPA admin, assistant)
 *  - 1 client portal user
 *  - 2 clients with contacts
 *  - 3 engagements
 *  - document requests, documents (stub records), messages, notices, signature requests, tasks, audit events
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const db = new PrismaClient();
const UPLOADS_DIR = path.resolve(process.env.LOCAL_STORAGE_PATH ?? "./uploads");

function makePdf(title: string): Buffer {
  const safe = title.replace(/[()\\]/g, " ").slice(0, 80);
  const contentStream = `BT /F1 14 Tf 50 750 Td (${safe}) Tj ET`;
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`;
  const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const header = `%PDF-1.4\n`;
  const objs = [obj1, obj2, obj3, obj4, obj5];
  const offsets: number[] = [];
  let body = header;
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(body));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body);
  let xref = `xref\n0 6\n0000000000 65535 f\r\n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n\r\n`;
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer);
}

async function seedFile(storagePath: string, buffer: Buffer): Promise<void> {
  const fullPath = path.join(UPLOADS_DIR, storagePath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, buffer);
}

async function main() {
  console.log("🌱  Seeding Barrana Accounting CRM demo data…");

  // ─── Users ────────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash("Demo1234!", 12);

  const superAdmin = await db.user.upsert({
    where: { email: "admin@barranaaccounting.ai" },
    update: {},
    create: {
      name: "Sarah Barrana",
      email: "admin@barranaaccounting.ai",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const cpaAdmin = await db.user.upsert({
    where: { email: "cpa@barranaaccounting.ai" },
    update: {},
    create: {
      name: "Michael Chen",
      email: "cpa@barranaaccounting.ai",
      passwordHash,
      role: "CPA_ADMIN",
      status: "ACTIVE",
    },
  });

  const assistant = await db.user.upsert({
    where: { email: "assistant@barranaaccounting.ai" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "assistant@barranaaccounting.ai",
      passwordHash,
      role: "ASSISTANT",
      status: "ACTIVE",
    },
  });

  const clientUser = await db.user.upsert({
    where: { email: "portal@techflow.ca" },
    update: {},
    create: {
      name: "James Okoye",
      email: "portal@techflow.ca",
      passwordHash,
      role: "CLIENT_USER",
      status: "ACTIVE",
    },
  });

  console.log("  ✓ Users");

  // ─── Clients ──────────────────────────────────────────────────────────────

  const techflow = await db.client.upsert({
    where: { id: "seed-client-1" },
    update: {},
    create: {
      id: "seed-client-1",
      businessName: "TechFlow Solutions Inc.",
      legalName: "TechFlow Solutions Inc.",
      clientType: "CORPORATION",
      industry: "Software & Technology",
      businessNumber: "123456789",
      hstNumber: "RT0001",
      primaryEmail: "contact@techflow.ca",
      primaryPhone: "416-555-0110",
      addressLine1: "200 Bay Street, Suite 1400",
      city: "Toronto",
      province: "ON",
      postalCode: "M5J 2J3",
      country: "Canada",
      status: "ACTIVE",
      internalNotes: "Fast-growing SaaS startup. Key contact is James Okoye (founder/CEO). Eligible for SR&ED. Fiscal year end Dec 31.",
      flags: ["SR_ED_ELIGIBLE", "HIGH_VALUE"],
    },
  });

  const greenleaf = await db.client.upsert({
    where: { id: "seed-client-2" },
    update: {},
    create: {
      id: "seed-client-2",
      businessName: "Greenleaf Realty Group",
      legalName: "Greenleaf Realty Group Ltd.",
      clientType: "CORPORATION",
      industry: "Real Estate",
      businessNumber: "987654321",
      primaryEmail: "info@greenleafrealty.ca",
      primaryPhone: "604-555-0234",
      addressLine1: "789 Granville Street",
      city: "Vancouver",
      province: "BC",
      postalCode: "V6Z 1K2",
      country: "Canada",
      status: "ACTIVE",
      internalNotes: "Property management company. Multiple holding entities. Fiscal year end March 31.",
    },
  });

  console.log("  ✓ Clients");

  // ─── Contacts ─────────────────────────────────────────────────────────────

  const techflowContact = await db.clientContact.upsert({
    where: { id: "seed-contact-1" },
    update: {},
    create: {
      id: "seed-contact-1",
      clientId: techflow.id,
      name: "James Okoye",
      email: "portal@techflow.ca",
      phone: "416-555-0101",
      title: "CEO & Founder",
      portalAccess: true,
      relationshipType: "PRIMARY",
    },
  });

  await db.clientContact.upsert({
    where: { id: "seed-contact-2" },
    update: {},
    create: {
      id: "seed-contact-2",
      clientId: techflow.id,
      name: "Aisha Patel",
      email: "aisha@techflow.ca",
      phone: "416-555-0102",
      title: "CFO",
      portalAccess: false,
      relationshipType: "BILLING",
    },
  });

  await db.clientContact.upsert({
    where: { id: "seed-contact-3" },
    update: {},
    create: {
      id: "seed-contact-3",
      clientId: greenleaf.id,
      name: "David Greenfield",
      email: "david@greenleafrealty.ca",
      phone: "604-555-0201",
      title: "Managing Partner",
      portalAccess: false,
      relationshipType: "PRIMARY",
    },
  });

  console.log("  ✓ Contacts");

  // ─── Portal link ──────────────────────────────────────────────────────────

  await db.clientUserLink.upsert({
    where: { userId_clientId: { userId: clientUser.id, clientId: techflow.id } },
    update: {},
    create: { userId: clientUser.id, clientId: techflow.id },
  });

  console.log("  ✓ Client portal link");

  // ─── Engagements ──────────────────────────────────────────────────────────

  const engTax = await db.engagement.upsert({
    where: { id: "seed-eng-1" },
    update: {},
    create: {
      id: "seed-eng-1",
      clientId: techflow.id,
      serviceType: "CORPORATE_TAX",
      title: "TechFlow — Corporate Tax 2024",
      description: "T2 corporate tax return for fiscal year ending December 31, 2024.",
      taxYear: 2024,
      assignedOwnerId: cpaAdmin.id,
      assignedAssistantId: assistant.id,
      status: "ACTIVE",
      notes: "SR&ED claim to be filed separately. Awaiting final payroll numbers from client.",
    },
  });

  const engBookkeeping = await db.engagement.upsert({
    where: { id: "seed-eng-2" },
    update: {},
    create: {
      id: "seed-eng-2",
      clientId: techflow.id,
      serviceType: "BOOKKEEPING",
      title: "TechFlow — Bookkeeping Q4 2024",
      description: "Quarterly bookkeeping and reconciliation for Q4 2024.",
      reportingPeriodStart: new Date("2024-10-01"),
      reportingPeriodEnd: new Date("2024-12-31"),
      assignedOwnerId: cpaAdmin.id,
      assignedAssistantId: assistant.id,
      status: "WAITING_ON_CLIENT",
    },
  });

  const engRealty = await db.engagement.upsert({
    where: { id: "seed-eng-3" },
    update: {},
    create: {
      id: "seed-eng-3",
      clientId: greenleaf.id,
      serviceType: "CORPORATE_TAX",
      title: "Greenleaf — Corporate Tax FY2024",
      description: "T2 corporate tax return for fiscal year ending March 31, 2024.",
      taxYear: 2024,
      assignedOwnerId: superAdmin.id,
      status: "IN_REVIEW",
    },
  });

  console.log("  ✓ Engagements");

  // ─── Document requests ────────────────────────────────────────────────────

  const req1 = await db.documentRequest.upsert({
    where: { id: "seed-req-1" },
    update: {},
    create: {
      id: "seed-req-1",
      clientId: techflow.id,
      engagementId: engTax.id,
      title: "2024 Bank Statements — All accounts",
      description: "Please upload your December 2024 bank statements for all corporate accounts.",
      requestedById: cpaAdmin.id,
      dueDate: new Date("2026-01-31"),
      status: "REQUESTED",
      priority: "HIGH",
      category: "BANK_STATEMENT",
    },
  });

  const req2 = await db.documentRequest.upsert({
    where: { id: "seed-req-2" },
    update: {},
    create: {
      id: "seed-req-2",
      clientId: techflow.id,
      engagementId: engBookkeeping.id,
      title: "Q4 2024 Payroll Summary",
      description: "Year-end payroll summary from your payroll processor for Q4 2024.",
      requestedById: assistant.id,
      dueDate: new Date("2026-02-15"),
      status: "UPLOADED",
      priority: "MEDIUM",
      category: "PAYROLL_REPORT",
    },
  });

  const req3 = await db.documentRequest.upsert({
    where: { id: "seed-req-3" },
    update: {},
    create: {
      id: "seed-req-3",
      clientId: techflow.id,
      engagementId: engTax.id,
      title: "Signed Engagement Letter",
      description: "Please sign and return the engagement letter for the 2024 tax year.",
      requestedById: cpaAdmin.id,
      dueDate: new Date("2026-01-15"),
      status: "ACCEPTED",
      priority: "URGENT",
      category: "ENGAGEMENT_LETTER",
    },
  });

  console.log("  ✓ Document requests");

  // ─── Documents (stub — no real file on disk) ──────────────────────────────
  // Create self-rooted stub documents without actual file storage.

  async function seedDocument(opts: {
    id: string;
    clientId: string;
    engagementId?: string;
    documentRequestId?: string;
    uploadedById: string;
    title: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    documentType: string;
    category: string;
    reviewStatus?: "UNREVIEWED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
    visibility?: "INTERNAL" | "CLIENT_VISIBLE";
    fileContent?: Buffer;
  }) {
    const { fileContent, ...docOpts } = opts;
    const storagePath = `demo/${opts.clientId}/${opts.id}/${opts.fileName}`;

    if (fileContent) {
      await seedFile(storagePath, fileContent);
    }

    const existing = await db.document.findUnique({ where: { id: opts.id } });
    if (existing) {
      if (fileContent) {
        await db.document.update({ where: { id: opts.id }, data: { fileSize: fileContent.length } });
      }
      return existing;
    }

    const doc = await db.document.create({
      data: {
        ...docOpts,
        storagePath,
        fileSize: fileContent ? fileContent.length : docOpts.fileSize,
        versionNumber: 1,
        isCurrentVersion: true,
        reviewStatus: docOpts.reviewStatus ?? "UNREVIEWED",
        visibility: docOpts.visibility ?? "INTERNAL",
      },
    });
    await db.document.update({ where: { id: doc.id }, data: { rootDocumentId: doc.id } });
    return doc;
  }

  const docEngagementLetter = await seedDocument({
    id: "seed-doc-1",
    clientId: techflow.id,
    engagementId: engTax.id,
    documentRequestId: req3.id,
    uploadedById: clientUser.id,
    title: "TechFlow Engagement Letter 2024",
    fileName: "engagement_letter_2024.pdf",
    mimeType: "application/pdf",
    fileSize: 245_000,
    documentType: "ENGAGEMENT_LETTER",
    category: "ENGAGEMENT_LETTER",
    reviewStatus: "ACCEPTED",
    visibility: "CLIENT_VISIBLE",
    fileContent: makePdf("TechFlow Engagement Letter 2024"),
  });

  const docFinancials = await seedDocument({
    id: "seed-doc-2",
    clientId: techflow.id,
    engagementId: engBookkeeping.id,
    uploadedById: cpaAdmin.id,
    title: "Q3 2024 Financial Statements",
    fileName: "techflow_q3_2024_financials.pdf",
    mimeType: "application/pdf",
    fileSize: 1_240_000,
    documentType: "FINANCIAL_STATEMENT",
    category: "FINANCIAL_STATEMENT",
    reviewStatus: "ACCEPTED",
    visibility: "CLIENT_VISIBLE",
    fileContent: makePdf("Q3 2024 Financial Statements - TechFlow Solutions"),
  });

  const docPayrollInternal = await seedDocument({
    id: "seed-doc-3",
    clientId: techflow.id,
    engagementId: engBookkeeping.id,
    documentRequestId: req2.id,
    uploadedById: assistant.id,
    title: "Q4 2024 Payroll Summary (Internal Review)",
    fileName: "payroll_q4_2024.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: 87_000,
    documentType: "PAYROLL_REPORT",
    category: "PAYROLL_REPORT",
    reviewStatus: "UNDER_REVIEW",
    visibility: "INTERNAL",
  });

  const docNoaSig = await seedDocument({
    id: "seed-doc-4",
    clientId: techflow.id,
    engagementId: engTax.id,
    uploadedById: cpaAdmin.id,
    title: "2024 T2 Corporate Tax Return — Draft",
    fileName: "techflow_t2_2024_draft.pdf",
    mimeType: "application/pdf",
    fileSize: 520_000,
    documentType: "TAX_RETURN",
    category: "TAX_RETURN",
    reviewStatus: "UNREVIEWED",
    visibility: "CLIENT_VISIBLE",
    fileContent: makePdf("2024 T2 Corporate Tax Return Draft - TechFlow Solutions"),
  });

  const docGreenleafNOA = await seedDocument({
    id: "seed-doc-5",
    clientId: greenleaf.id,
    engagementId: engRealty.id,
    uploadedById: superAdmin.id,
    title: "Notice of Assessment — Greenleaf FY2024",
    fileName: "greenleaf_noa_2024.pdf",
    mimeType: "application/pdf",
    fileSize: 180_000,
    documentType: "NOTICE_OF_ASSESSMENT",
    category: "GOVERNMENT_CORRESPONDENCE",
    reviewStatus: "ACCEPTED",
    visibility: "CLIENT_VISIBLE",
  });

  console.log("  ✓ Documents");

  // ─── Notices ──────────────────────────────────────────────────────────────

  const noticeEngLetter = await db.noticeLetter.upsert({
    where: { id: "seed-notice-1" },
    update: {},
    create: {
      id: "seed-notice-1",
      clientId: techflow.id,
      engagementId: engTax.id,
      title: "2024 Engagement Letter — TechFlow Solutions",
      description: "Please review and sign your engagement letter for the 2024 tax year filing.",
      noticeType: "ENGAGEMENT_LETTER",
      documentId: docEngagementLetter.id,
      publishedById: cpaAdmin.id,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  const noticeNOA = await db.noticeLetter.upsert({
    where: { id: "seed-notice-2" },
    update: {},
    create: {
      id: "seed-notice-2",
      clientId: greenleaf.id,
      engagementId: engRealty.id,
      title: "Notice of Assessment — FY2024",
      description: "CRA has issued the Notice of Assessment for Greenleaf Realty's 2024 fiscal year.",
      noticeType: "NOTICE_OF_ASSESSMENT",
      documentId: docGreenleafNOA.id,
      publishedById: superAdmin.id,
      status: "VIEWED",
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      clientViewedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
  });

  // Draft notice for demo — staff can publish this during the demo (flow e)
  await db.noticeLetter.upsert({
    where: { id: "seed-notice-3" },
    update: {},
    create: {
      id: "seed-notice-3",
      clientId: techflow.id,
      engagementId: engTax.id,
      title: "2024 T2 Draft Ready — Please Review",
      description: "Your 2024 corporate tax return draft is ready. Please review before we proceed to filing.",
      noticeType: "REPORT",
      documentId: docNoaSig.id,
      publishedById: cpaAdmin.id,
      status: "DRAFT",
    },
  });

  console.log("  ✓ Notices");

  // ─── Signature requests ───────────────────────────────────────────────────

  await db.signatureRequest.upsert({
    where: { id: "seed-sig-1" },
    update: {},
    create: {
      id: "seed-sig-1",
      clientId: techflow.id,
      engagementId: engTax.id,
      documentId: docEngagementLetter.id,
      requestedById: cpaAdmin.id,
      title: "Sign: 2024 Engagement Letter",
      message: "Please review and sign the engagement letter to authorize us to prepare your 2024 tax return.",
      provider: "mock",
      providerEnvelopeId: "mock-env-seed-001",
      status: "SIGNED",
      sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      viewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      signedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
    },
  });

  await db.signatureRequest.upsert({
    where: { id: "seed-sig-2" },
    update: {},
    create: {
      id: "seed-sig-2",
      clientId: techflow.id,
      engagementId: engTax.id,
      documentId: docNoaSig.id,
      requestedById: cpaAdmin.id,
      title: "Review & Sign: 2024 T2 Corporate Tax Return",
      message: "Your 2024 corporate tax return draft is ready for your review and signature before we file with the CRA.",
      provider: "mock",
      providerEnvelopeId: "mock-env-seed-002",
      status: "SENT",
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("  ✓ Signature requests");

  // ─── Message threads & messages ───────────────────────────────────────────

  const thread1 = await db.messageThread.upsert({
    where: { id: "seed-thread-1" },
    update: {},
    create: {
      id: "seed-thread-1",
      clientId: techflow.id,
      engagementId: engTax.id,
      subject: "2024 Corporate Tax Return — Questions",
      threadType: "CLIENT_STAFF",
      status: "WAITING_ON_CLIENT",
    },
  });

  const msgs1 = [
    {
      id: "seed-msg-1",
      threadId: thread1.id,
      authorId: cpaAdmin.id,
      body: "Hi James, we have started working on your 2024 corporate tax return. We noticed your SR&ED expenditures may qualify for an ITC claim. Could you provide a breakdown of your R&D staff hours and related salary costs?",
      isInternal: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-msg-2",
      threadId: thread1.id,
      authorId: clientUser.id,
      body: "Thanks Michael! I'll pull that together. We had two developers working on our AI module — roughly 60% of their time from January to September. I'll get you the exact numbers by end of week.",
      isInternal: false,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-msg-3",
      threadId: thread1.id,
      authorId: cpaAdmin.id,
      body: "Perfect, that sounds like it could be a meaningful claim. Also please include any third-party contractor costs related to R&D activities.",
      isInternal: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const msg of msgs1) {
    await db.message.upsert({
      where: { id: msg.id },
      update: {},
      create: msg,
    });
  }

  const thread2 = await db.messageThread.upsert({
    where: { id: "seed-thread-2" },
    update: {},
    create: {
      id: "seed-thread-2",
      clientId: techflow.id,
      engagementId: engTax.id,
      subject: "Internal: TechFlow SR&ED Strategy",
      threadType: "INTERNAL",
      status: "OPEN",
    },
  });

  await db.message.upsert({
    where: { id: "seed-msg-4" },
    update: {},
    create: {
      id: "seed-msg-4",
      threadId: thread2.id,
      authorId: cpaAdmin.id,
      body: "Priya — please dig into their GitHub commit history and payroll records when they come in. I want to make sure we're maximizing the SR&ED claim before we submit.",
      isInternal: true,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  await db.message.upsert({
    where: { id: "seed-msg-5" },
    update: {},
    create: {
      id: "seed-msg-5",
      threadId: thread2.id,
      authorId: assistant.id,
      body: "On it. I'll also check if any of their cloud infrastructure costs qualify under the experimental development expenditure category.",
      isInternal: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const thread3 = await db.messageThread.upsert({
    where: { id: "seed-thread-3" },
    update: {},
    create: {
      id: "seed-thread-3",
      clientId: greenleaf.id,
      engagementId: engRealty.id,
      subject: "NOA received — next steps",
      threadType: "CLIENT_STAFF",
      status: "OPEN",
    },
  });

  await db.message.upsert({
    where: { id: "seed-msg-6" },
    update: {},
    create: {
      id: "seed-msg-6",
      threadId: thread3.id,
      authorId: superAdmin.id,
      body: "David, CRA has issued your Notice of Assessment for FY2024. No adjustments were made — your return was accepted as filed. You can view and download the NOA from your documents.",
      isInternal: false,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("  ✓ Message threads & messages");

  // ─── Tasks ────────────────────────────────────────────────────────────────

  const tasks = [
    {
      id: "seed-task-1",
      clientId: techflow.id,
      engagementId: engTax.id,
      assignedToId: cpaAdmin.id,
      createdById: superAdmin.id,
      title: "Review T2 draft before client approval",
      description: "Final review of TechFlow's T2 corporate return — check SR&ED calculations, capital cost allowance, and foreign income sections.",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: "IN_PROGRESS" as const,
      priority: "URGENT" as const,
      clientVisible: false,
    },
    {
      id: "seed-task-2",
      clientId: techflow.id,
      engagementId: engBookkeeping.id,
      assignedToId: assistant.id,
      createdById: cpaAdmin.id,
      title: "Reconcile Q4 bank statements",
      description: "Complete Q4 bank reconciliation once client uploads all statements.",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: "WAITING_ON_CLIENT" as const,
      priority: "HIGH" as const,
      clientVisible: false,
    },
    {
      id: "seed-task-3",
      clientId: techflow.id,
      engagementId: engTax.id,
      assignedToId: assistant.id,
      createdById: cpaAdmin.id,
      title: "Compile SR&ED expenditure schedule",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "TO_DO" as const,
      priority: "HIGH" as const,
      clientVisible: false,
    },
    {
      id: "seed-task-4",
      clientId: greenleaf.id,
      engagementId: engRealty.id,
      assignedToId: superAdmin.id,
      createdById: superAdmin.id,
      title: "Archive Greenleaf FY2024 engagement",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "TO_DO" as const,
      priority: "LOW" as const,
      clientVisible: false,
    },
    {
      id: "seed-task-5",
      clientId: null,
      engagementId: null,
      assignedToId: superAdmin.id,
      createdById: superAdmin.id,
      title: "Renew E&O professional liability insurance",
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // overdue
      status: "TO_DO" as const,
      priority: "URGENT" as const,
      clientVisible: false,
    },
  ];

  for (const t of tasks) {
    await db.task.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
  }

  console.log("  ✓ Tasks");

  // ─── Audit events ─────────────────────────────────────────────────────────

  const auditSeeds = [
    {
      id: "seed-audit-1",
      actorUserId: cpaAdmin.id,
      clientId: techflow.id,
      engagementId: engTax.id,
      entityType: "Engagement",
      entityId: engTax.id,
      action: "ENGAGEMENT_CREATED",
      metadata: { title: engTax.title },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-audit-2",
      actorUserId: cpaAdmin.id,
      clientId: techflow.id,
      engagementId: engTax.id,
      entityType: "SignatureRequest",
      entityId: "seed-sig-1",
      action: "SIGNATURE_REQUEST_SENT",
      metadata: { provider: "mock", title: "Sign: 2024 Engagement Letter" },
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-audit-3",
      actorUserId: clientUser.id,
      clientId: techflow.id,
      entityType: "SignatureRequest",
      entityId: "seed-sig-1",
      action: "SIGNATURE_REQUEST_SIGNED",
      metadata: { provider: "mock" },
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-audit-4",
      actorUserId: cpaAdmin.id,
      clientId: techflow.id,
      engagementId: engTax.id,
      entityType: "NoticeLetter",
      entityId: noticeEngLetter.id,
      action: "NOTICE_PUBLISHED",
      metadata: { title: noticeEngLetter.title },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-audit-5",
      actorUserId: cpaAdmin.id,
      clientId: techflow.id,
      engagementId: engTax.id,
      entityType: "SignatureRequest",
      entityId: "seed-sig-2",
      action: "SIGNATURE_REQUEST_SENT",
      metadata: { provider: "mock", title: "Review & Sign: 2024 T2 Corporate Tax Return" },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-audit-6",
      actorUserId: superAdmin.id,
      clientId: greenleaf.id,
      engagementId: engRealty.id,
      entityType: "NoticeLetter",
      entityId: noticeNOA.id,
      action: "NOTICE_PUBLISHED",
      metadata: { title: noticeNOA.title },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-audit-7",
      actorUserId: assistant.id,
      clientId: techflow.id,
      engagementId: engBookkeeping.id,
      entityType: "Document",
      entityId: docPayrollInternal.id,
      action: "DOCUMENT_UPLOADED",
      metadata: { title: docPayrollInternal.title, fileSize: docPayrollInternal.fileSize },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const evt of auditSeeds) {
    await db.auditEvent.upsert({
      where: { id: evt.id },
      update: {},
      create: evt,
    });
  }

  console.log("  ✓ Audit events");

  // ─── Notifications ────────────────────────────────────────────────────────

  await db.notification.upsert({
    where: { id: "seed-notif-1" },
    update: {},
    create: {
      id: "seed-notif-1",
      userId: clientUser.id,
      title: "New signature request",
      body: "Review & Sign: 2024 T2 Corporate Tax Return",
      link: "/portal/signatures",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await db.notification.upsert({
    where: { id: "seed-notif-2" },
    update: {},
    create: {
      id: "seed-notif-2",
      userId: clientUser.id,
      title: "Engagement letter ready",
      body: "Your 2024 engagement letter has been published.",
      link: "/portal/notices",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });

  await db.notification.upsert({
    where: { id: "seed-notif-3" },
    update: {},
    create: {
      id: "seed-notif-3",
      userId: cpaAdmin.id,
      title: "Document signed",
      body: "Sign: 2024 Engagement Letter — signed by James Okoye",
      link: "/signatures",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("  ✓ Notifications");
  console.log("\n✅  Seed complete!\n");
  console.log("Demo credentials (password: Demo1234! for all):");
  console.log("  SUPER_ADMIN   admin@barranaaccounting.ai");
  console.log("  CPA_ADMIN     cpa@barranaaccounting.ai");
  console.log("  ASSISTANT     assistant@barranaaccounting.ai");
  console.log("  CLIENT_USER   portal@techflow.ca  (linked to TechFlow Solutions)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
