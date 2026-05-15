import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Retry wrapper for database operations.
 * Handles cold-start connection failures on Render free tier.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`DB operation failed (attempt ${attempt}/${retries}), retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Unreachable");
}
