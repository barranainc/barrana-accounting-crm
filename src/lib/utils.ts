import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast } from "date-fns";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isOverdue(dueDate: Date | string | null | undefined, status?: string): boolean {
  if (!dueDate) return false;
  if (status === "DONE" || status === "CANCELLED" || status === "ACCEPTED" || status === "COMPLETED") return false;
  return isPast(new Date(dueDate));
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileUrl(documentId: string, download = false): string {
  return `/api/files/${documentId}${download ? "?download=1" : ""}`;
}

export function generateStoragePath(clientId: string, fileName: string): string {
  const ext = fileName.split(".").pop() ?? "bin";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `clients/${clientId}/${timestamp}_${random}.${ext}`;
}

export const ALLOWED_MIME_TYPES = (
  process.env.ALLOWED_MIME_TYPES ??
  "application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.ms-excel"
).split(",");

export const MAX_FILE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB ?? "25", 10)) * 1024 * 1024;
