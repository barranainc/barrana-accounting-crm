import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route groups (staff), (portal), (auth) do NOT affect URL paths in Next.js App Router.
// These are the actual URL paths that need protection.

const STAFF_PATHS = [
  "/dashboard", "/clients", "/engagements", "/documents",
  "/messages", "/notices", "/signatures", "/tasks", "/audit", "/settings",
];

// Paths within staff area restricted to SUPER_ADMIN and CPA_ADMIN
const CPA_ADMIN_PATHS = ["/audit"];

// Paths within staff area restricted to SUPER_ADMIN only
const SUPER_ADMIN_PATHS = ["/settings"];

const PORTAL_PATHS = ["/portal"];

const PUBLIC_PATHS = ["/login", "/forgot-password", "/unauthorised"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export default auth(function middleware(
  req: NextRequest & { auth: { user?: { role?: string } } | null }
) {
  const { pathname } = req.nextUrl;

  // Always allow public paths and Next.js internals
  if (matchesPrefix(pathname, PUBLIC_PATHS)) return NextResponse.next();
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const session = req.auth;
  const role = session?.user?.role as string | undefined;

  // Not authenticated — send to login
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const isStaff =
    role === "SUPER_ADMIN" || role === "CPA_ADMIN" || role === "ASSISTANT";
  const isClientUser = role === "CLIENT_USER";
  const isCpaOrSuper = role === "SUPER_ADMIN" || role === "CPA_ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const inStaffArea = matchesPrefix(pathname, STAFF_PATHS);
  const inPortalArea = matchesPrefix(pathname, PORTAL_PATHS);

  // Client user trying to access staff area → redirect to portal
  if (inStaffArea && isClientUser) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/dashboard";
    return NextResponse.redirect(url);
  }

  // Staff trying to access portal area → redirect to dashboard
  if (inPortalArea && isStaff) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Portal area requires CLIENT_USER
  if (inPortalArea && !isClientUser) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorised";
    return NextResponse.redirect(url);
  }

  // CPA_ADMIN-gated paths (assistants blocked)
  if (matchesPrefix(pathname, CPA_ADMIN_PATHS) && !isCpaOrSuper) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorised";
    return NextResponse.redirect(url);
  }

  // SUPER_ADMIN-only paths
  if (matchesPrefix(pathname, SUPER_ADMIN_PATHS) && !isSuperAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorised";
    return NextResponse.redirect(url);
  }

  // Root redirect
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = isClientUser ? "/portal/dashboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)",
  ],
};
