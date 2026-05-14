import type { Readable } from "stream";

export interface StoredFile {
  stream: Readable;
  mimeType: string;
  size: number;
  fileName: string;
}

export interface StorageService {
  /** Save a file and return the internal storage path */
  save(opts: {
    path: string;
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }): Promise<string>;

  /** Retrieve a file for streaming */
  get(storagePath: string): Promise<StoredFile>;

  /** Delete a file */
  delete(storagePath: string): Promise<void>;

  /** Check existence */
  exists(storagePath: string): Promise<boolean>;
}
