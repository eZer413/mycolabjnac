import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { NewBatchDefaults } from "@/components/NewBatchModal";

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

// Always render fresh data (single-user local DB, mutations via server actions).
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const last = await prisma.batch.findFirst({ orderBy: { createdAt: "desc" } });

  const defaults: NewBatchDefaults = {
    species: last?.species ?? settings.species[0]?.name ?? "",
    zone: last?.zone ?? settings.zones[0] ?? "",
    sterilizationMethod:
      last?.sterilizationMethod ?? settings.sterilizationMethods[0] ?? "",
    quantity: last?.quantity ?? 100,
    pdaBatchRef: last?.pdaBatchRef ?? "",
  };

  return (
    <html lang="en">
      <body>
        <AppShell
          options={{
            species: settings.species,
            zones: settings.zones,
            sterilizationMethods: settings.sterilizationMethods,
          }}
          defaults={defaults}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
