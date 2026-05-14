import { requireStaff } from "@/lib/permissions";
import { StaffSidebar } from "@/components/layout/StaffSidebar";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  return (
    <div className="flex h-screen overflow-hidden bg-brand-greyLight">
      <StaffSidebar userName={session.user.name ?? ""} userRole={session.user.role} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
