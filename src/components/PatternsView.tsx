import { PatternReport, Segment, pct } from "@/lib/patterns";

export function PatternsView({ report }: { report: PatternReport }) {
  const { overall } = report;

  return (
    <div className="pb-4">
      {/* Overall */}
      <div className="mb-5 rounded-2xl border border-ink-600 bg-ink-800 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Overall contamination rate
        </p>
        <p
          className={[
            "mt-1 text-4xl font-bold",
            overall.rate >= 0.25 ? "text-status-contaminated" : "text-moss-400",
          ].join(" ")}
        >
          {overall.denominator === 0 ? "—" : pct(overall.rate)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {overall.contaminated} contaminated of {overall.denominator}{" "}
          non-discarded batches
        </p>
      </div>

      <SegmentGroup title="By sterilization method" segments={report.bySterilization} />
      <SegmentGroup title="By zone" segments={report.byZone} />
      <SegmentGroup title="By species" segments={report.bySpecies} />

      <p className="mt-4 text-center text-xs text-zinc-600">
        Rate = contaminated ÷ non-discarded batches. Segments highlighted red are
        ≥ 25% with 3+ batches.
      </p>
    </div>
  );
}

function SegmentGroup({
  title,
  segments,
}: {
  title: string;
  segments: Segment[];
}) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 text-sm font-semibold text-zinc-300">{title}</h2>
      {segments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-500 px-4 py-6 text-center text-sm text-zinc-500">
          No data yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {segments.map((s) => (
            <Bar key={s.label} seg={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Bar({ seg }: { seg: Segment }) {
  const width = Math.max(2, Math.round(seg.rate * 100)); // min sliver so 0% is visible
  return (
    <li>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 truncate text-sm text-zinc-200">
          {seg.high && (
            <span
              className="text-status-contaminated"
              aria-label="High contamination"
              title="High contamination"
            >
              ▲
            </span>
          )}
          {seg.label}
        </span>
        <span
          className={[
            "shrink-0 text-sm font-semibold tabular-nums",
            seg.high ? "text-status-contaminated" : "text-zinc-300",
          ].join(" ")}
        >
          {pct(seg.rate)}
          <span className="ml-1 text-xs font-normal text-zinc-500">
            ({seg.contaminated}/{seg.denominator})
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
        <div
          className={[
            "h-full rounded-full",
            seg.high ? "bg-status-contaminated" : "bg-moss-500",
          ].join(" ")}
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}
