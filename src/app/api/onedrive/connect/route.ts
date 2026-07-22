import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { authorizeUrl } from "@/lib/onedrive/graph";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// GET /api/onedrive/connect — starts the OAuth hand-off to Microsoft.
// Admin-only: whoever connects grants this app access to their whole OneDrive.
export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  // CSRF guard — the callback only accepts a state it handed out.
  const state = crypto.randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("onedrive_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  try {
    return NextResponse.redirect(authorizeUrl(state));
  } catch (e) {
    const message = e instanceof Error ? e.message : "OneDrive is not configured.";
    const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return NextResponse.redirect(`${base}/settings?onedrive=error&message=${encodeURIComponent(message)}`);
  }
}
