"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/PageHeader";
import { PatternsView } from "@/components/PatternsView";
import { getPatternReport } from "@/lib/local/store";

export default function PatternsPage() {
  const report = useLiveQuery(getPatternReport, []);

  return (
    <>
      <PageHeader title="Patterns" subtitle="What's failing, and where" />
      {report && <PatternsView report={report} />}
    </>
  );
}
