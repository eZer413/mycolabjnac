import { PageHeader } from "@/components/PageHeader";
import { MediaCalculator } from "@/components/MediaCalculator";
import { MediaPrepList, MediaPrepRow } from "@/components/MediaPrepList";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const s = await getSettings();
  const preps = await prisma.mediaPrep.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const prepRows: MediaPrepRow[] = preps.map((p) => ({
    id: p.id,
    volumeMl: p.volumeMl,
    pdaGrams: p.pdaGrams,
    antibioticMg: p.antibioticMg,
    createdAt: p.createdAt.toISOString(),
    antibioticLabel: s.antibioticConsumableName,
  }));

  return (
    <>
      <PageHeader
        title="Media"
        subtitle="PDA + antibiotic calculator"
        settingsLink
      />
      <MediaCalculator
        pdaGramsPerLiter={s.pdaGramsPerLiter}
        antibioticMgPerLiter={s.antibioticMgPerLiter}
        pdaConsumableName={s.pdaConsumableName}
        antibioticConsumableName={s.antibioticConsumableName}
      />
      <MediaPrepList preps={prepRows} />
    </>
  );
}
