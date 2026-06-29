"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/portal/dashboard",  label: "Dashboard"  },
  { href: "/portal/requests",   label: "Requests"   },
  { href: "/portal/documents",  label: "Documents"  },
  { href: "/portal/messages",   label: "Messages"   },
  { href: "/portal/notices",    label: "Notices"    },
  { href: "/portal/signatures", label: "Signatures" },
];

interface PortalNavProps {
  userName: string;
  businessName?: string;
  documentsUnread?: number;
}

export function PortalNav({ userName, businessName, documentsUnread = 0 }: PortalNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-brand-greyBorder bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-navy">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-brand-navy">Barrana Accounting</span>
              {businessName && <span className="ml-2 text-xs text-muted-foreground">{businessName}</span>}
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-brand-navy/10 text-brand-navy"
                    : "text-muted-foreground hover:bg-brand-greyLight hover:text-foreground"
                )}
              >
                {label}
                {href === "/portal/documents" && documentsUnread > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 align-middle text-[10px] font-semibold text-white">
                    {documentsUnread}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{userName}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
