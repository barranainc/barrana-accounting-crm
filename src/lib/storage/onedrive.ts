import type { StorageService, StoredFile } from "./types";
import { LocalStorageService } from "./local";
import { db } from "@/lib/db";
import {
  ROOT_FOLDER,
  ensureFolder,
  uploadFile,
  downloadItem,
  deleteItem,
  itemExists,
} from "@/lib/onedrive/graph";

// Stored on Document.storagePath so we can tell OneDrive items apart from the
// legacy local-disk paths that older documents still carry.
const PREFIX = "onedrive:";

/**
 * Keeps every client's documents in their own OneDrive folder:
 *
 *   <ONEDRIVE_ROOT_FOLDER>/<Client business name>/<original file name>
 *
 * Files uploaded before OneDrive was switched on still resolve through the
 * local-disk service, so nothing breaks mid-migration.
 */
export class OneDriveStorageService implements StorageService {
  private legacy = new LocalStorageService();

  private isOneDrive(storagePath: string): boolean {
    return storagePath.startsWith(PREFIX);
  }

  private itemId(storagePath: string): string {
    return storagePath.slice(PREFIX.length);
  }

  /** Paths look like `clients/<clientId>/<timestamp>_<rand>.<ext>`. */
  private async folderNameFor(path: string): Promise<string> {
    const clientId = path.match(/^clients\/([^/]+)\//)?.[1];
    if (!clientId) return "Unfiled";
    const client = await db.client
      .findUnique({ where: { id: clientId }, select: { businessName: true } })
      .catch(() => null);
    return client?.businessName?.trim() || "Unfiled";
  }

  async save(opts: { path: string; buffer: Buffer; mimeType: string; fileName: string }): Promise<string> {
    const folderName = await this.folderNameFor(opts.path);
    const folderId = await ensureFolder([ROOT_FOLDER, folderName]);
    const item = await uploadFile(folderId, opts.fileName, opts.buffer, opts.mimeType);
    return `${PREFIX}${item.id}`;
  }

  async get(storagePath: string): Promise<StoredFile> {
    if (!this.isOneDrive(storagePath)) return this.legacy.get(storagePath);
    const file = await downloadItem(this.itemId(storagePath));
    return { stream: file.stream, mimeType: file.mimeType, size: file.size, fileName: file.name };
  }

  async delete(storagePath: string): Promise<void> {
    if (!this.isOneDrive(storagePath)) return this.legacy.delete(storagePath);
    await deleteItem(this.itemId(storagePath));
  }

  async exists(storagePath: string): Promise<boolean> {
    if (!this.isOneDrive(storagePath)) return this.legacy.exists(storagePath);
    return itemExists(this.itemId(storagePath));
  }
}
