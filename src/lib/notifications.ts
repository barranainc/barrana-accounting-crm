import { db } from "@/lib/db";

interface CreateNotificationOpts {
  userId: string;
  title: string;
  body: string;
  link?: string;
}

// In-app notification. Email delivery is stubbed via the email adapter.
export async function createNotification(opts: CreateNotificationOpts): Promise<void> {
  try {
    await db.notification.create({ data: opts });
  } catch (err) {
    console.error("[notification] Failed to create notification:", err);
  }
}
