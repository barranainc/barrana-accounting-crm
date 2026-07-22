import { db } from "@/lib/db";
import type { Readable } from "stream";

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft Graph / OneDrive client.
//
// The OneDrive we talk to belongs to a personal Microsoft account, which cannot
// grant app-only (client-credentials) access. So a staff member connects it once
// via OAuth and we keep the resulting refresh token in OneDriveConnection; every
// call mints a short-lived access token from it. Microsoft rotates the refresh
// token on each use, so the new one is always written back.
// ─────────────────────────────────────────────────────────────────────────────

const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
export const SCOPES = "offline_access Files.ReadWrite User.Read";
const CONNECTION_ID = "singleton";

/** Files up to this size go in one PUT; larger ones use an upload session. */
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024; // must be a multiple of 320 KiB

export const ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER?.trim() || "Barrana CRM";

export function redirectUri(): string {
  if (process.env.ONEDRIVE_REDIRECT_URI) return process.env.ONEDRIVE_REDIRECT_URI;
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/onedrive/callback`;
}

function credentials() {
  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "OneDrive is not configured. Set ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET."
    );
  }
  return { clientId, clientSecret };
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function authorizeUrl(state: string): string {
  const { clientId } = credentials();
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: SCOPES,
    state,
  });
  return `${AUTHORITY}/authorize?${q.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const desc = (json as { error_description?: string }).error_description;
    throw new Error(desc ? desc.split("\n")[0] : `Token request failed (${res.status})`);
  }
  return json as TokenResponse;
}

/** Completes the OAuth dance and stores the connection. */
export async function connectWithCode(code: string) {
  const { clientId, clientSecret } = credentials();
  const tokens = await tokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
  });
  if (!tokens.refresh_token) {
    throw new Error("Microsoft did not return a refresh token — check that 'offline_access' is granted.");
  }

  const me = await fetch(`${GRAPH}/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  const accountEmail: string | null = me?.mail ?? me?.userPrincipalName ?? null;
  const accountName: string | null = me?.displayName ?? null;

  await db.oneDriveConnection.upsert({
    where: { id: CONNECTION_ID },
    create: { id: CONNECTION_ID, refreshToken: tokens.refresh_token, accountEmail, accountName, lastError: null },
    update: { refreshToken: tokens.refresh_token, accountEmail, accountName, lastError: null, driveId: null, rootFolderId: null },
  });

  cached = { token: tokens.access_token, expiresAt: Date.now() + (tokens.expires_in - 60) * 1000 };
  return { accountEmail, accountName };
}

export async function getConnection() {
  return db.oneDriveConnection.findUnique({ where: { id: CONNECTION_ID } });
}

export async function disconnect() {
  await db.oneDriveConnection.deleteMany({ where: { id: CONNECTION_ID } });
  cached = null;
}

// In-memory access token so we don't hit the token endpoint on every request.
let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const conn = await getConnection();
  if (!conn) throw new Error("OneDrive is not connected. Connect it from Settings.");

  const { clientId, clientSecret } = credentials();
  try {
    const tokens = await tokenRequest({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refreshToken,
      grant_type: "refresh_token",
      scope: SCOPES,
    });
    // Microsoft rotates refresh tokens — persist the new one or the link dies.
    if (tokens.refresh_token && tokens.refresh_token !== conn.refreshToken) {
      await db.oneDriveConnection.update({
        where: { id: CONNECTION_ID },
        data: { refreshToken: tokens.refresh_token, lastError: null },
      });
    } else if (conn.lastError) {
      await db.oneDriveConnection.update({ where: { id: CONNECTION_ID }, data: { lastError: null } });
    }
    cached = { token: tokens.access_token, expiresAt: Date.now() + (tokens.expires_in - 60) * 1000 };
    return cached.token;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.oneDriveConnection
      .update({ where: { id: CONNECTION_ID }, data: { lastError: message } })
      .catch(() => {});
    throw new Error(`OneDrive connection expired — reconnect it from Settings. (${message})`);
  }
}

// ─── Graph helpers ───────────────────────────────────────────────────────────

async function graph(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(path.startsWith("http") ? path : `${GRAPH}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  });
}

async function graphJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await graph(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = JSON.parse(body);
      if (j?.error?.message) msg = j.error.message;
    } catch { /* keep the status line */ }
    throw new Error(`OneDrive: ${msg}`);
  }
  return (await res.json()) as T;
}

/** OneDrive rejects these in item names. */
export function sanitizeName(name: string): string {
  return (name || "untitled")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim()
    .slice(0, 120) || "untitled";
}

const encodePath = (segments: string[]) => segments.map((s) => encodeURIComponent(s)).join("/");

/** Returns the id of the folder at `segments`, creating any missing levels. */
export async function ensureFolder(segments: string[]): Promise<string> {
  let parentId: string | null = null;
  const walked: string[] = [];

  for (const raw of segments) {
    const name = sanitizeName(raw);
    walked.push(name);
    const existing = await graph(`/me/drive/root:/${encodePath(walked)}`);
    if (existing.ok) {
      parentId = ((await existing.json()) as { id: string }).id;
      continue;
    }
    if (existing.status !== 404) {
      const body = await existing.text().catch(() => "");
      throw new Error(`OneDrive: could not read folder "${name}" (${existing.status}) ${body.slice(0, 120)}`);
    }
    const createRes = await graph(
      parentId ? `/me/drive/items/${parentId}/children` : `/me/drive/root/children`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
      }
    );
    if (createRes.ok) {
      parentId = ((await createRes.json()) as { id: string }).id;
      continue;
    }
    if (createRes.status === 409) {
      // Someone created it between our GET and POST — just read it back.
      const again = await graph(`/me/drive/root:/${encodePath(walked)}`);
      if (again.ok) {
        parentId = ((await again.json()) as { id: string }).id;
        continue;
      }
    }
    const errBody = await createRes.text().catch(() => "");
    throw new Error(`OneDrive: could not create folder "${name}" (${createRes.status}) ${errBody.slice(0, 160)}`);
  }

  if (!parentId) throw new Error("OneDrive: no folder path given");
  return parentId;
}

export interface UploadedItem {
  id: string;
  name: string;
  size: number;
  webUrl?: string;
}

/** Uploads into `folderId`, renaming on conflict so nothing is overwritten. */
export async function uploadFile(
  folderId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<UploadedItem> {
  const name = sanitizeName(fileName);

  if (buffer.length <= SIMPLE_UPLOAD_LIMIT) {
    const res = await graph(
      `/me/drive/items/${folderId}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`,
      { method: "PUT", headers: { "Content-Type": mimeType || "application/octet-stream" }, body: new Uint8Array(buffer) }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OneDrive upload failed (${res.status}): ${body.slice(0, 200)}`);
    }
    return (await res.json()) as UploadedItem;
  }

  // Large file → resumable session, uploaded in ordered chunks.
  const session = await graphJson<{ uploadUrl: string }>(
    `/me/drive/items/${folderId}:/${encodeURIComponent(name)}:/createUploadSession`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename", name } }),
    }
  );

  const total = buffer.length;
  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total) - 1;
    const chunk = buffer.subarray(start, end + 1);
    const res = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end}/${total}`,
      },
      body: new Uint8Array(chunk),
    });
    if (res.status === 200 || res.status === 201) return (await res.json()) as UploadedItem;
    if (res.status !== 202) {
      const body = await res.text().catch(() => "");
      throw new Error(`OneDrive chunk upload failed (${res.status}): ${body.slice(0, 200)}`);
    }
  }
  throw new Error("OneDrive: upload session finished without returning the item");
}

export async function getItem(itemId: string) {
  return graphJson<{ id: string; name: string; size: number; file?: { mimeType?: string } }>(
    `/me/drive/items/${itemId}`
  );
}

export async function itemExists(itemId: string): Promise<boolean> {
  const res = await graph(`/me/drive/items/${itemId}`);
  return res.ok;
}

export async function downloadItem(itemId: string): Promise<{ stream: Readable; size: number; name: string; mimeType: string }> {
  const meta = await getItem(itemId);
  const res = await graph(`/me/drive/items/${itemId}/content`);
  if (!res.ok || !res.body) {
    throw new Error(`OneDrive download failed (${res.status})`);
  }
  const { Readable: NodeReadable } = await import("stream");
  const stream = NodeReadable.fromWeb(res.body as Parameters<typeof NodeReadable.fromWeb>[0]);
  return {
    stream: stream as unknown as Readable,
    size: meta.size ?? 0,
    name: meta.name,
    mimeType: meta.file?.mimeType ?? "application/octet-stream",
  };
}

export async function deleteItem(itemId: string): Promise<void> {
  const res = await graph(`/me/drive/items/${itemId}`, { method: "DELETE" });
  // 404 means it's already gone, which is the outcome we wanted.
  if (!res.ok && res.status !== 404) {
    throw new Error(`OneDrive delete failed (${res.status})`);
  }
}
