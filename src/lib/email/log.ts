import type { EmailAdapter, SendEmailOpts } from "./types";

// Dev stub — logs to console. Swap for SendGrid/Resend/SES in production.
export class LogEmailAdapter implements EmailAdapter {
  async send(opts: SendEmailOpts): Promise<void> {
    console.log("[email:stub] →", {
      to: opts.to,
      subject: opts.subject,
      body: opts.body.slice(0, 120),
    });
  }
}
