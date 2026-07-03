import { PageHeader } from "@/components/PageHeader";
import { PatternsView } from "@/components/PatternsView";
import { prisma } from "@/lib/db";
import { buildPatternReport } from "@/lib/patterns";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const batches = await prisma.batch.findMany({
    select: {
      outcome: true,
      sterilizationMethod: true,
      zone: true,
      species: true,
    },
  });

  const report = buildPatternReport(batches);

  return (
    <>
      <PageHeader title="Patterns" subtitle="What's failing, and where" />
      <PatternsView report={report} />
    </>
  );
}
