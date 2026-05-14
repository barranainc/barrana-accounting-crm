import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Barrana Accounting", template: "%s | Barrana Accounting" },
  description: "Secure client portal and workflow management for Barrana Accounting Services.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>{children}</body>
    </html>
  );
}
