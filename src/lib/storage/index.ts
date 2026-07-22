import type { StorageService } from "./types";
import { LocalStorageService } from "./local";
import { OneDriveStorageService } from "./onedrive";

// Factory — swap STORAGE_PROVIDER env var to switch implementations
// e.g. "onedrive" | "local"
function createStorageService(): StorageService {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase();
  switch (provider) {
    case "local":
      return new LocalStorageService();
    case "onedrive":
      return new OneDriveStorageService();
    // Future: case "s3": return new S3StorageService();
    default:
      console.warn(`[storage] Unknown STORAGE_PROVIDER "${provider}", falling back to local.`);
      return new LocalStorageService();
  }
}

export const storage: StorageService = createStorageService();
export type { StorageService } from "./types";
