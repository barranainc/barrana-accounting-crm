import type { SignatureProvider } from "./types";
import { MockSignatureProvider } from "./mock";

function createSignatureProvider(): SignatureProvider {
  const provider = process.env.SIGNATURE_PROVIDER ?? "mock";
  switch (provider) {
    case "mock":
      return new MockSignatureProvider();
    // Future: case "docusign": return new DocuSignProvider();
    // Future: case "dropboxsign": return new DropboxSignProvider();
    default:
      return new MockSignatureProvider();
  }
}

export const signatureProvider: SignatureProvider = createSignatureProvider();
export type { SignatureProvider, CreateEnvelopeOpts, EnvelopeResult, EnvelopeStatus } from "./types";
