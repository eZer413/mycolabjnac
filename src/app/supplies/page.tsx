"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/PageHeader";
import { ConsumablesTracker } from "@/components/ConsumablesTracker";
import { listConsumables } from "@/lib/local/store";

export default function SuppliesPage() {
  const rows = useLiveQuery(listConsumables, []);

  return (
    <>
      <PageHeader title="Supplies" subtitle="Consumable stock" settingsLink />
      {rows && <ConsumablesTracker items={rows} />}
    </>
  );
}
