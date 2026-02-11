import type { Metadata } from "next";
import "./globals.css";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Rootvrse - AI Image Workflow",
  description: "Node-based image annotation and generation workflow using Nano Banana Pro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div id="a11y-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
        <main id="main-content" role="main">
          {children}
        </main>
        <Toast />
      </body>
    </html>
  );
}
