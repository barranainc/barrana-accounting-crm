import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  // Client
  ACTIVE:              "badge-active",
  ONBOARDING:          "badge-onboarding",
  INACTIVE:            "badge-inactive",
  ARCHIVED:            "badge-archived",
  // Engagement
  DRAFT:               "badge-draft",
  WAITING_ON_CLIENT:   "badge-waiting-client",
  IN_REVIEW:           "badge-in-review",
  COMPLETED:           "badge-completed",
  ON_HOLD:             "badge-on-hold",
  // Document request / review
  REQUESTED:           "badge-requested",
  UPLOADED:            "badge-uploaded",
  UNDER_REVIEW:        "badge-in-review",
  ACCEPTED:            "badge-accepted",
  REJECTED:            "badge-rejected",
  NEEDS_REPLACEMENT:   "badge-needs-replace",
  UNREVIEWED:          "badge-draft",
  // Notice
  PUBLISHED:           "badge-published",
  VIEWED:              "badge-viewed",
  SUPERSEDED:          "badge-inactive",
  // Signature
  SENT:                "badge-sent",
  SIGNED:              "badge-signed",
  EXPIRED:             "badge-expired",
  CANCELLED:           "badge-cancelled",
  // Task
  TO_DO:               "badge-draft",
  IN_PROGRESS:         "badge-in-review",
  DONE:                "badge-completed",
  // Thread
  OPEN:                "badge-active",
  WAITING_ON_STAFF:    "badge-waiting-client",
  CLOSED:              "badge-inactive",
  // Visibility
  INTERNAL:            "badge-internal",
  CLIENT_VISIBLE:      "badge-client-visible",
};

const statusLabels: Record<string, string> = {
  ACTIVE:            "Active",
  ONBOARDING:        "Onboarding",
  INACTIVE:          "Inactive",
  ARCHIVED:          "Archived",
  DRAFT:             "Draft",
  WAITING_ON_CLIENT: "Waiting on Client",
  IN_REVIEW:         "In Review",
  COMPLETED:         "Completed",
  ON_HOLD:           "On Hold",
  REQUESTED:         "Requested",
  UPLOADED:          "Submitted",
  UNDER_REVIEW:      "Under Review",
  ACCEPTED:          "Accepted",
  REJECTED:          "Rejected",
  NEEDS_REPLACEMENT: "Needs Replacement",
  UNREVIEWED:        "Unreviewed",
  PUBLISHED:         "Published",
  VIEWED:            "Viewed",
  SUPERSEDED:        "Superseded",
  SENT:              "Sent",
  SIGNED:            "Signed",
  EXPIRED:           "Expired",
  CANCELLED:         "Cancelled",
  TO_DO:             "To Do",
  IN_PROGRESS:       "In Progress",
  DONE:              "Done",
  OPEN:              "Open",
  WAITING_ON_STAFF:  "Waiting on Staff",
  CLOSED:            "Closed",
  INTERNAL:          "Internal",
  CLIENT_VISIBLE:    "Client Visible",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  label?: string;
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const cls = statusClasses[status] ?? "badge-draft";
  const text = label ?? statusLabels[status] ?? status;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cls, className)}>
      {text}
    </span>
  );
}
