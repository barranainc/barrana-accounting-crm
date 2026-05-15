import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

// ─── Role classification ──────────────────────────────────────────────────────

export function isStaff(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "CPA_ADMIN" || role === "ASSISTANT";
}

export function isAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "CPA_ADMIN";
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export function isClientUser(role: UserRole): boolean {
  return role === "CLIENT_USER";
}

// ─── Server-side session guards (call at top of Server Actions / pages) ───────

export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireStaff(): Promise<Session> {
  const session = await requireAuth();
  if (!isStaff(session.user.role)) {
    // Client users get redirected to their portal instead of a 403 page
    if (isClientUser(session.user.role)) redirect("/portal/dashboard");
    redirect("/unauthorised");
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) redirect("/unauthorised");
  return session;
}

export async function requireSuperAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (!isSuperAdmin(session.user.role)) redirect("/unauthorised");
  return session;
}

export async function requireClientUser(): Promise<Session> {
  const session = await requireAuth();
  if (!isClientUser(session.user.role)) {
    // Staff users get redirected to their dashboard instead of a 403 page
    if (isStaff(session.user.role)) redirect("/dashboard");
    redirect("/unauthorised");
  }
  return session;
}

// ─── Server Action guards (throw instead of redirect — actions can't redirect) ─

export async function assertStaff(): Promise<Session> {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) {
    throw new Error("Unauthorised");
  }
  return session;
}

export async function assertAdmin(): Promise<Session> {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    throw new Error("Unauthorised");
  }
  return session;
}

export async function assertSuperAdmin(): Promise<Session> {
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    throw new Error("Unauthorised");
  }
  return session;
}

export async function assertAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorised");
  return session;
}

// ─── Client scope guard ───────────────────────────────────────────────────────
// For CLIENT_USER: verifies the user is linked to the given clientId.
// For staff: always passes.

import { db } from "@/lib/db";

export async function assertClientAccess(clientId: string): Promise<Session> {
  const session = await assertAuth();
  if (isStaff(session.user.role)) return session;

  const link = await db.clientUserLink.findUnique({
    where: { userId_clientId: { userId: session.user.id, clientId } },
  });
  if (!link) throw new Error("Unauthorised");
  return session;
}
