import type { StorageService, StoredFile } from "./types";
import fs from "fs";
import path from "path";

const BASE_DIR = path.resolve(process.env.LOCAL_STORAGE_PATH ?? "./uploads");

export class LocalStorageService implements StorageService {
  private resolve(storagePath: string): string {
    // Prevent path traversal
    const resolved = path.resolve(BASE_DIR, storagePath);
    if (!resolved.startsWith(BASE_DIR)) {
      throw new Error("Invalid storage path");
    }
    return resolved;
  }

  async save(opts: { path: string; buffer: Buffer; mimeType: string; fileName: string }): Promise<string> {
    const fullPath = this.resolve(opts.path);
    const dir = path.dirname(fullPath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, opts.buffer);
    return opts.path;
  }

  async get(storagePath: string): Promise<StoredFile> {
    const fullPath = this.resolve(storagePath);
    const stat = await fs.promises.stat(fullPath);
    const stream = fs.createReadStream(fullPath);
    const fileName = path.basename(storagePath);
    return {
      stream: stream as unknown as import("stream").Readable,
      mimeType: "application/octet-stream",
      size: stat.size,
      fileName,
    };
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = this.resolve(storagePath);
    try {
      await fs.promises.unlink(fullPath);
    } catch {
      // Ignore missing file on delete
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolve(storagePath);
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
