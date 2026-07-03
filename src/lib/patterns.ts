import { Outcome } from "./defaults";

export type BatchLike = {
  outcome: string;
  sterilizationMethod: string;
  zone: string;
  species: string;
};

export type Segment = {
  label: string;
  contaminated: number;
  denominator: number; // non-discarded batches in this segment
  rate: number; // contaminated / denominator (0 when denominator === 0)
  high: boolean;
};

export type PatternReport = {
  overall: { contaminated: number; denominator: number; rate: number };
  bySterilization: Segment[];
  byZone: Segment[];
  bySpecies: Segment[];
};

// A segment is flagged "high" when its rate is at least this and it has enough
// samples to be meaningful.
const HIGH_RATE = 0.25;
const MIN_SAMPLE = 3;

function segmentsFor(
  batches: BatchLike[],
  keyOf: (b: BatchLike) => string,
): Segment[] {
  const map = new Map<string, { contaminated: number; denominator: number }>();
  for (const b of batches) {
    if (b.outcome === ("DISCARDED" satisfies Outcome)) continue; // excluded from denominator
    const key = keyOf(b);
    const entry = map.get(key) ?? { contaminated: 0, denominator: 0 };
    entry.denominator += 1;
    if (b.outcome === ("CONTAMINATED" satisfies Outcome)) entry.contaminated += 1;
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([label, v]) => {
      const rate = v.denominator === 0 ? 0 : v.contaminated / v.denominator;
      return {
        label,
        contaminated: v.contaminated,
        denominator: v.denominator,
        rate,
        high: rate >= HIGH_RATE && v.denominator >= MIN_SAMPLE,
      };
    })
    .sort((a, b) => b.rate - a.rate || b.denominator - a.denominator);
}

// contamination rate = contaminated / non-discarded batches, overall and per segment.
export function buildPatternReport(batches: BatchLike[]): PatternReport {
  const nonDiscarded = batches.filter((b) => b.outcome !== "DISCARDED");
  const contaminated = nonDiscarded.filter(
    (b) => b.outcome === "CONTAMINATED",
  ).length;
  const denominator = nonDiscarded.length;

  return {
    overall: {
      contaminated,
      denominator,
      rate: denominator === 0 ? 0 : contaminated / denominator,
    },
    bySterilization: segmentsFor(batches, (b) => b.sterilizationMethod),
    byZone: segmentsFor(batches, (b) => b.zone),
    bySpecies: segmentsFor(batches, (b) => b.species),
  };
}

export function pct(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}
