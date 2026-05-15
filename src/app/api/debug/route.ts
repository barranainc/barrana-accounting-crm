import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) ?? "NOT SET",
    nextAuthUrl: process.env.NEXTAUTH_URL ?? "NOT SET",
    nodeEnv: process.env.NODE_ENV,
  });
}
