"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/PageHeader";
import { MediaCalculator } from "@/components/MediaCalculator";
import { MediaPrepList } from "@/components/MediaPrepList";
import { getMediaContext } from "@/lib/local/store";

export default function MediaPage() {
  const ctx = useLiveQuery(getMediaContext, []);

  return (
    <>
      <PageHeader
        title="Media"
        subtitle="PDA + antibiotic calculator"
        settingsLink
      />
      {ctx && (
        <>
          <MediaCalculator
            pdaGramsPerLiter={ctx.pdaGramsPerLiter}
            antibioticMgPerLiter={ctx.antibioticMgPerLiter}
            pdaConsumableName={ctx.pdaConsumableName}
            antibioticConsumableName={ctx.antibioticConsumableName}
          />
          <MediaPrepList preps={ctx.preps} />
        </>
      )}
    </>
  );
}
