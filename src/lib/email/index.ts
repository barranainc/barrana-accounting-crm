import type { EmailAdapter } from "./types";
import { LogEmailAdapter } from "./log";

function createEmailAdapter(): EmailAdapter {
  const provider = process.env.EMAIL_PROVIDER ?? "log";
  switch (provider) {
    case "log":
      return new LogEmailAdapter();
    // Future: case "resend": return new ResendAdapter();
    // Future: case "sendgrid": return new SendGridAdapter();
    default:
      return new LogEmailAdapter();
  }
}

export const email: EmailAdapter = createEmailAdapter();
export type { EmailAdapter, SendEmailOpts } from "./types";
