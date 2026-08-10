"use server";

import { db } from "@/lib/db";
import { assertStaff, assertAdmin } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveChecklistKeys, type ClientTypeKey } from "@/lib/document-checklist";

const clientSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  legalName: z.string().optional(),
  clientType: z.enum(["CORPORATION", "SOLE_PROPRIETOR", "PARTNERSHIP", "TRUST", "NON_PROFIT", "INDIVIDUAL"]),
  industry: z.string().optional(),
  businessNumber: z.string().optional(),
  hstNumber: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  primaryEmail: z.string().email("Valid email required"),
  primaryPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  internalNotes: z.string().optional(),
  status: z.enum(["ACTIVE", "ONBOARDING", "INACTIVE", "ARCHIVED"]).default("ONBOARDING"),
  selectedDocumentKeys: z.array(z.string()).optional(),
});

export async function createClient(formData: z.infer<typeof clientSchema>) {
  const session = await assertStaff();
  const { selectedDocumentKeys, ...data } = clientSchema.parse(formData);

  // Duplicate warning check
  const existing = await db.client.findFirst({
    where: {
      businessName: { equals: data.businessName, mode: "insensitive" },
      primaryEmail: { equals: data.primaryEmail, mode: "insensitive" },
      status: { not: "ARCHIVED" },
    },
  });
  if (existing) {
    throw new Error(`A client with this business name and email already exists (ID: ${existing.id})`);
  }

  const client = await db.client.create({ data });

  // Persist the checked document-checklist items as document requests for this client.
  const checklistItems = selectedDocumentKeys?.length
    ? resolveChecklistKeys(data.clientType as ClientTypeKey, selectedDocumentKeys)
    : [];
  if (checklistItems.length) {
    await db.documentRequest.createMany({
      data: checklistItems.map((it) => ({
        clientId: client.id,
        requestedById: session.user.id,
        title: it.title,
        description: it.note ?? null,
        category: it.category,
      })),
    });
  }

  await createAuditEvent({
    action: AuditAction.CLIENT_CREATED,
    actorUserId: session.user.id,
    clientId: client.id,
    entityType: "Client",
    entityId: client.id,
    metadata: { businessName: client.businessName, documentRequestCount: checklistItems.length },
  });

  revalidatePath("/clients");
  return { id: client.id };
}

export async function updateClient(clientId: string, formData: Partial<z.infer<typeof clientSchema>>) {
  const session = await assertStaff();

  const { selectedDocumentKeys, ...data } = formData;
  void selectedDocumentKeys; // checklist is set at creation; not editable here in this MVP
  const client = await db.client.update({
    where: { id: clientId },
    data,
  });

  await createAuditEvent({
    action: AuditAction.CLIENT_UPDATED,
    actorUserId: session.user.id,
    clientId: client.id,
    entityType: "Client",
    entityId: client.id,
    metadata: { updated: Object.keys(formData) },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return client;
}

export async function archiveClient(clientId: string) {
  const session = await assertAdmin();

  const client = await db.client.update({
    where: { id: clientId },
    data: { status: "ARCHIVED" },
  });

  await createAuditEvent({
    action: AuditAction.CLIENT_ARCHIVED,
    actorUserId: session.user.id,
    clientId: client.id,
    entityType: "Client",
    entityId: client.id,
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClientFlags(clientId: string, flags: string[]) {
  const session = await assertStaff();
  const client = await db.client.update({ where: { id: clientId }, data: { flags } });
  await createAuditEvent({
    action: AuditAction.CLIENT_UPDATED,
    actorUserId: session.user.id,
    clientId,
    entityType: "Client",
    entityId: clientId,
    metadata: { flags },
  });
  revalidatePath(`/clients/${clientId}`);
  return client;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  title: z.string().optional(),
  portalAccess: z.boolean().default(false),
  relationshipType: z.string().optional(),
});

export async function createContact(clientId: string, formData: z.infer<typeof contactSchema>) {
  const session = await assertStaff();
  const data = contactSchema.parse(formData);

  const contact = await db.clientContact.create({ data: { ...data, clientId } });

  await createAuditEvent({
    action: AuditAction.CLIENT_CONTACT_CREATED,
    actorUserId: session.user.id,
    clientId,
    entityType: "ClientContact",
    entityId: contact.id,
    metadata: { name: contact.name, email: contact.email },
  });

  revalidatePath(`/clients/${clientId}`);
  return contact;
}

export async function updateContact(contactId: string, clientId: string, formData: Partial<z.infer<typeof contactSchema>>) {
  const session = await assertStaff();
  const contact = await db.clientContact.update({ where: { id: contactId }, data: formData });
  await createAuditEvent({
    action: AuditAction.CLIENT_CONTACT_UPDATED,
    actorUserId: session.user.id,
    clientId,
    entityType: "ClientContact",
    entityId: contactId,
  });
  revalidatePath(`/clients/${clientId}`);
  return contact;
}

// ─── Portal invite ────────────────────────────────────────────────────────────

import bcrypt from "bcryptjs";

export async function invitePortalUser(opts: {
  clientId: string;
  name: string;
  email: string;
  tempPassword: string;
}) {
  const session = await assertAdmin();

  const existingUser = await db.user.findUnique({ where: { email: opts.email } });
  if (existingUser) {
    // If user already exists, just ensure the link
    await db.clientUserLink.upsert({
      where: { userId_clientId: { userId: existingUser.id, clientId: opts.clientId } },
      create: { userId: existingUser.id, clientId: opts.clientId },
      update: {},
    });
    await createAuditEvent({
      action: AuditAction.CLIENT_PORTAL_INVITED,
      actorUserId: session.user.id,
      clientId: opts.clientId,
      entityType: "User",
      entityId: existingUser.id,
      metadata: { email: opts.email, relinked: true },
    });
    return { userId: existingUser.id };
  }

  const passwordHash = await bcrypt.hash(opts.tempPassword, 12);
  const user = await db.user.create({
    data: {
      name: opts.name,
      email: opts.email,
      passwordHash,
      role: "CLIENT_USER",
      status: "ACTIVE",
      clientLinks: { create: { clientId: opts.clientId } },
    },
  });

  await createAuditEvent({
    action: AuditAction.CLIENT_PORTAL_INVITED,
    actorUserId: session.user.id,
    clientId: opts.clientId,
    entityType: "User",
    entityId: user.id,
    metadata: { email: opts.email },
  });

  revalidatePath(`/clients/${opts.clientId}`);
  return { userId: user.id };
}
