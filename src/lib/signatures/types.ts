import type { SignatureStatus } from "@prisma/client";

export interface CreateEnvelopeOpts {
  title: string;
  signerEmail: string;
  signerName: string;
  documentPath: string;
  expiresAt?: Date;
}

export interface EnvelopeResult {
  envelopeId: string;
}

export interface EnvelopeStatus {
  status: SignatureStatus;
  signedAt?: Date;
}

export interface SignatureProvider {
  createEnvelope(opts: CreateEnvelopeOpts): Promise<EnvelopeResult>;
  // Generates a fresh signing URL on demand.
  // Real providers (DocuSign, Dropbox Sign) return time-limited URLs here — never store them.
  getViewUrl(envelopeId: string): Promise<string>;
  getStatus(envelopeId: string): Promise<EnvelopeStatus>;
  cancel(envelopeId: string): Promise<void>;
  getSignedDocument(envelopeId: string): Promise<Buffer>;
}
