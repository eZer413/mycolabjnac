import { PageHeader } from "@/components/PageHeader";
import { ConsumablesTracker, ConsumableRow } from "@/components/ConsumablesTracker";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SuppliesPage() {
  const items = await prisma.consumable.findMany({ orderBy: { name: "asc" } });
  const rows: ConsumableRow[] = items.map((c) => ({
    id: c.id,
    name: c.name,
    unit: c.unit,
    stock: c.stock,
    threshold: c.threshold,
  }));

  return (
    <>
      <PageHeader title="Supplies" subtitle="Consumable stock" settingsLink />
      <ConsumablesTracker items={rows} />
    </>
  );
}
