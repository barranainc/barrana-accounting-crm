import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { isStaff } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";

// Protected file-serving endpoint.
// URL format: /api/files/[documentId]/[filename]
// Never exposes raw storage paths.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { path } = await params;
  const documentId = path[0];
  if (!documentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { role, id: userId } = session.user;

  // Staff: full access
  // Client: must be linked to this client AND document must be CLIENT_VISIBLE
  if (!isStaff(role)) {
    if (document.visibility !== "CLIENT_VISIBLE") {
      return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
    }
    const link = await db.clientUserLink.findUnique({
      where: { userId_clientId: { userId, clientId: document.clientId } },
    });
    if (!link) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
    }
  }

  const download = req.nextUrl.searchParams.get("download") === "1";

  try {
    const file = await storage.get(document.storagePath);
    const headers = new Headers();
    headers.set("Content-Type", document.mimeType);
    headers.set("Content-Length", String(document.fileSize));

    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${document.fileName}"`);
    } else {
      headers.set("Content-Disposition", `inline; filename="${document.fileName}"`);
    }

    // Audit the access
    await createAuditEvent({
      action: download ? AuditAction.DOCUMENT_DOWNLOADED : AuditAction.DOCUMENT_VIEWED,
      actorUserId: userId,
      clientId: document.clientId,
      entityType: "Document",
      entityId: document.id,
      metadata: { fileName: document.fileName, download },
    });

    // Stream the file
    const chunks: Buffer[] = [];
    for await (const chunk of file.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    return new NextResponse(body, { headers });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
