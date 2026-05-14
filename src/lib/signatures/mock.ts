import type { SignatureProvider, CreateEnvelopeOpts, EnvelopeResult, EnvelopeStatus } from "./types";
import { randomUUID } from "crypto";

// Mock provider — preserves the real provider interface.
// Replace with DocuSign / Dropbox Sign / PandaDoc in production.
export class MockSignatureProvider implements SignatureProvider {
  async createEnvelope(opts: CreateEnvelopeOpts): Promise<EnvelopeResult> {
    const envelopeId = `mock_${randomUUID()}`;
    console.log("[signature:mock] Envelope created →", { envelopeId, ...opts });
    return { envelopeId };
  }

  // In Phase 1 the mock routes back to our own portal signing page.
  // Real providers (DocuSign, Dropbox Sign) return a time-limited external URL here.
  // Never store the result — call getViewUrl() fresh every time the user clicks "Sign now".
  async getViewUrl(envelopeId: string): Promise<string> {
    console.log("[signature:mock] getViewUrl →", envelopeId);
    return `/portal/signatures/${envelopeId}/sign`;
  }

  async getStatus(envelopeId: string): Promise<EnvelopeStatus> {
    console.log("[signature:mock] getStatus →", envelopeId);
    return { status: "SENT" };
  }

  async cancel(envelopeId: string): Promise<void> {
    console.log("[signature:mock] cancel →", envelopeId);
  }

  async getSignedDocument(_envelopeId: string): Promise<Buffer> {
    return Buffer.from("[MOCK SIGNED DOCUMENT]");
  }
}
