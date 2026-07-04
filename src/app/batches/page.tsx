"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/PageHeader";
import { BatchTracker } from "@/components/BatchTracker";
import { listBatches } from "@/lib/local/store";

export default function BatchesPage() {
  // Reads from the on-device database and re-renders automatically whenever a
  // batch is added, edited, or deleted — no manual refresh needed.
  const rows = useLiveQuery(listBatches, []);

  return (
    <>
      <PageHeader
        title="Batches"
        subtitle={rows ? `${rows.length} logged` : "…"}
        settingsLink
      />
      {rows && <BatchTracker batches={rows} />}
    </>
  );
}
