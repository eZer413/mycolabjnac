import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "MycoLab",
  description: "Mushroom cultivation lab manager",
};

export const viewport: Viewport = {
  themeColor: "#0a0e0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// The shell no longer fetches data on the server: AppShell loads the "New batch"
// options/defaults from the on-device store itself, so the whole app runs
// offline with no server render step.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
