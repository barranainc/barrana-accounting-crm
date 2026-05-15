import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Health check endpoint — Render pings this to keep the service alive.
 * Also warms up the database connection.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch {
    return NextResponse.json({ status: "ok", db: "waking" }, { status: 200 });
  }
}
