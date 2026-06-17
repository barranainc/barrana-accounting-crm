"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, MessageSquare,
  Bell, PenLine, CheckSquare, ShieldCheck, Settings, LogOut, FolderOpen, Landmark,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { UserRole } from "@prisma/client";

const navItems = [
  { href: "/dashboard",         label: "Dashboard",         icon: LayoutDashboard },
  { href: "/clients",           label: "Clients",           icon: Users },
  { href: "/documents",         label: "Documents",         icon: FileText },
  { href: "/documents/requests",label: "Requests",          icon: FolderOpen },
  { href: "/statements",        label: "Bank Imports",      icon: Landmark },
  { href: "/messages",          label: "Messages",          icon: MessageSquare },
  { href: "/notices",           label: "Notices",           icon: Bell },
  { href: "/signatures",        label: "Signatures",        icon: PenLine },
  { href: "/tasks",             label: "Tasks",             icon: CheckSquare },
];

const adminItems = [
  { href: "/audit",    label: "Audit Log", icon: ShieldCheck },
  { href: "/settings", label: "Settings",  icon: Settings,   adminOnly: true },
];

interface StaffSidebarProps {
  userName: string;
  userRole: UserRole;
}

export function StaffSidebar({ userName, userRole }: StaffSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
          <span className="text-white font-bold text-sm">B</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Barrana</p>
          <p className="text-xs text-sidebar-foreground/60 leading-tight">Accounting Services</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {/* Admin section */}
        {(userRole === "SUPER_ADMIN" || userRole === "CPA_ADMIN") && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            {adminItems.map(({ href, label, icon: Icon, adminOnly }) => {
              if (adminOnly && userRole !== "SUPER_ADMIN") return null;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(href)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
            <span className="text-xs font-semibold text-white">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{userName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {userRole === "SUPER_ADMIN" ? "Super Admin" : userRole === "CPA_ADMIN" ? "CPA / Admin" : "Assistant"}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
