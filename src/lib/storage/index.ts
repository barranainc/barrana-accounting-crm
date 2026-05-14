import type { StorageService } from "./types";
import { LocalStorageService } from "./local";

// Factory — swap STORAGE_PROVIDER env var to switch implementations
// e.g. "s3" | "supabase" | "local"
function createStorageService(): StorageService {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  switch (provider) {
    case "local":
      return new LocalStorageService();
    // Future: case "s3": return new S3StorageService();
    // Future: case "supabase": return new SupabaseStorageService();
    default:
      return new LocalStorageService();
  }
}

export const storage: StorageService = createStorageService();
export type { StorageService } from "./types";
