import { PageHeader } from "@/components/PageHeader";
import { BatchTracker, BatchRow } from "@/components/BatchTracker";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const batches = await prisma.batch.findMany({
    orderBy: [{ inoculationDate: "desc" }, { createdAt: "desc" }],
  });

  const rows: BatchRow[] = batches.map((b) => ({
    id: b.id,
    species: b.species,
    quantity: b.quantity,
    pdaBatchRef: b.pdaBatchRef,
    sterilizationMethod: b.sterilizationMethod,
    inoculationDate: b.inoculationDate.toISOString(),
    zone: b.zone,
    outcome: b.outcome,
    notes: b.notes,
  }));

  return (
    <>
      <PageHeader
        title="Batches"
        subtitle={`${rows.length} logged`}
        settingsLink
      />
      <BatchTracker batches={rows} />
    </>
  );
}
