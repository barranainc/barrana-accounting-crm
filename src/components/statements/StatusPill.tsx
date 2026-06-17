const PILL: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-600",
  PROCESSING: "bg-amber-100 text-amber-700",
  EXTRACTED: "bg-blue-100 text-blue-700",
  REVIEWED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

const LABEL: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing…",
  EXTRACTED: "Extracted — review",
  REVIEWED: "Reviewed",
  FAILED: "Failed",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        PILL[status] ?? "bg-zinc-100 text-zinc-600"
      }`}
    >
      {LABEL[status] ?? status}
    </span>
  );
}
