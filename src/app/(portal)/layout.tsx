import { requireClientUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PortalNav } from "@/components/layout/PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClientUser();

  const link = await db.clientUserLink.findFirst({
    where: { userId: session.user.id },
    include: { client: { select: { businessName: true } } },
  });

  const documentsUnread = link
    ? await db.documentComment.count({
        where: {
          document: { clientId: link.clientId },
          isInternal: false,
          readByClientAt: null,
          author: { role: { not: "CLIENT_USER" } },
        },
      })
    : 0;

  return (
    <div className="min-h-screen bg-brand-greyLight">
      <PortalNav
        userName={session.user.name ?? ""}
        businessName={link?.client.businessName}
        documentsUnread={documentsUnread}
      />
      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
