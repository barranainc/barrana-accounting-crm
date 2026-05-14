import Link from "next/link";

export default function UnauthorisedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-greyLight px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10">
          <span className="text-2xl font-bold text-brand-navy">403</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Access denied</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You do not have permission to view this page.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
        >
          Go to your dashboard
        </Link>
      </div>
    </div>
  );
}
