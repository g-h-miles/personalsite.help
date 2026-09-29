import type { Doc } from "@convex/_generated/dataModel";
import {
  DIMENSION_GROUP_LABELS,
  DIMENSION_LABELS,
  type DimensionGroup,
  dimensionGroup,
} from "@convex/judgment/taxonomy";
import { formatOverall } from "@/lib/format";
import { cn } from "@/lib/utils";

type ScorecardDoc = Doc<"scorecards">;
type DimensionRow = ScorecardDoc["dimensions"][number];

/**
 * Tier 1 instant scorecard. Dimensions arrive already ordered by the site's
 * help-wanted focus; the requested ones are marked.
 */
export function Scorecard({
  scorecard,
  status,
  error,
}: {
  scorecard: ScorecardDoc | null;
  status: "pending" | "ready" | "failed";
  error?: string;
}) {
  if (!scorecard) {
    return (
      <div className="text-muted-foreground">
        {status === "failed" ? (
          <>
            <p>We couldn't score this site automatically.</p>
            {error && <p className="mt-1 text-xs">{error}</p>}
          </>
        ) : (
          <p>Scoring…</p>
        )}
      </div>
    );
  }

  // Group while keeping the stored (focus-first) order; the group holding the
  // first (most-wanted) dimension comes first.
  const groups: DimensionGroup[] = [];
  for (const d of scorecard.dimensions) {
    const g = dimensionGroup(d.dimension);
    if (!groups.includes(g)) groups.push(g);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl tabular-nums">
          {formatOverall(scorecard.overall)}
        </span>
        <span className="text-sm text-muted-foreground">
          overall · {scorecard.provider === "mock" ? "mock scorer" : scorecard.provider}
        </span>
      </div>
      {groups.map((group) => (
        <section key={group}>
          <h3 className="mb-2 text-lg">{DIMENSION_GROUP_LABELS[group]}</h3>
          <ul className="divide-y divide-border border-y border-border">
            {scorecard.dimensions
              .filter((d) => dimensionGroup(d.dimension) === group)
              .map((d) => (
                <DimensionItem key={d.dimension} row={d} />
              ))}
          </ul>
        </section>
      ))}
      {error && <p className="text-xs text-muted-foreground">Last re-audit failed: {error}</p>}
    </div>
  );
}

function DimensionItem({ row }: { row: DimensionRow }) {
  const requested = row.weight > 1;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 py-2">
      <div className="flex items-center gap-2">
        <span>{DIMENSION_LABELS[row.dimension]}</span>
        {requested && <span className="bg-note px-1.5 text-xs">asked</span>}
      </div>
      <div className="flex items-center gap-3">
        <Meter score={row.score} max={row.maxScore} />
        <span className="w-16 text-right text-sm tabular-nums text-muted-foreground">
          {row.level}
          <span className="sr-only">
            , {row.score} of {row.maxScore}, confidence {Math.round(row.confidence * 100)}%
          </span>
        </span>
      </div>
    </li>
  );
}

function Meter({ score, max }: { score: number; max: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 w-3",
            i < score ? (score <= 2 ? "bg-primary" : "bg-foreground") : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}
