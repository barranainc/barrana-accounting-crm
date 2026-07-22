import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { connectWithCode } from "@/lib/onedrive/graph";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function settingsUrl(params: Record<string, string>): string {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/settings?${new URLSearchParams(params).toString()}`;
}

// GET /api/onedrive/callback — Microsoft sends the user back here with a code.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const jar = await cookies();
  const expected = jar.get("onedrive_oauth_state")?.value;
  jar.delete("onedrive_oauth_state");

  if (oauthError) {
    return NextResponse.redirect(settingsUrl({ onedrive: "error", message: oauthError.split("\n")[0] }));
  }
  if (!state || !expected || state !== expected) {
    return NextResponse.redirect(
      settingsUrl({ onedrive: "error", message: "The sign-in request expired. Please try connecting again." })
    );
  }
  if (!code) {
    return NextResponse.redirect(settingsUrl({ onedrive: "error", message: "Microsoft did not return an authorisation code." }));
  }

  try {
    const { accountEmail } = await connectWithCode(code);
    await createAuditEvent({
      action: AuditAction.ONEDRIVE_CONNECTED,
      actorUserId: session.user.id,
      entityType: "OneDriveConnection",
      entityId: "singleton",
      metadata: { accountEmail },
    });
    return NextResponse.redirect(settingsUrl({ onedrive: "connected", account: accountEmail ?? "" }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not connect OneDrive.";
    return NextResponse.redirect(settingsUrl({ onedrive: "error", message }));
  }
}
