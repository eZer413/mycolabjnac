import { PageHeader } from "@/components/PageHeader";
import { MediaCalculator } from "@/components/MediaCalculator";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const s = await getSettings();
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
    </>
  );
}
