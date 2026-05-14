export interface SendEmailOpts {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface EmailAdapter {
  send(opts: SendEmailOpts): Promise<void>;
}
