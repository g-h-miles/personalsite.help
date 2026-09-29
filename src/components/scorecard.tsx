import type { Doc } from "@convex/_generated/dataModel";
import { type Dimension, type DimensionGroup, dimensionGroup } from "@convex/judgment/taxonomy";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type ScorecardDoc = Doc<"scorecards">;
type DimensionRow = ScorecardDoc["dimensions"][number];

/** Scorecard wording, written to the site owner (the taxonomy labels are more neutral). */
const ROW_LABELS: Record<Dimension, string> = {
  clarity: "Clear who you are",
  background: "Communicates your background",
  memorability: "Voice and personality",
  callToAction: "Tells me what to do next",
  visualHierarchy: "Visual hierarchy",
  typography: "Typography",
  copyQuality: "Copy quality",
  accessibility: "Accessibility basics",
};

const GROUP_TITLES: Record<DimensionGroup, string> = {
  sell: "Does it sell you?",
  craft: "Craft",
};

/** Score on a 0–10 scale, one decimal: 2 of 5 → "4.0". */
function outOfTen(row: DimensionRow): string {
  return ((row.score / row.maxScore) * 10).toFixed(1);
}

/** "in 212ms" for a fresh scorecard; "3 days ago" otherwise (e.g. after a re-audit). */
function timing(scorecard: ScorecardDoc, submittedAt: number): string {
  const elapsed = scorecard.createdAt - submittedAt;
  const provider = scorecard.provider === "mock" ? "mock · " : "";
  if (elapsed > 0 && elapsed < 1000) return `${provider}in ${elapsed}ms`;
  if (elapsed >= 1000 && elapsed < 60_000) return `${provider}in ${(elapsed / 1000).toFixed(1)}s`;
  return `${provider}${timeAgo(scorecard.createdAt)}`;
}

/**
 * Tier 1 instant scorecard. Dimensions arrive already ordered by the site's
 * help-wanted focus, so the group the person asked about comes first. The
 * weakest dimension is marked in red pen.
 */
export function Scorecard({
  scorecard,
  status,
  error,
  submittedAt,
}: {
  scorecard: ScorecardDoc | null;
  status: "pending" | "ready" | "failed";
  error?: string;
  submittedAt: number;
}) {
  return (
    <section aria-labelledby="scorecard-title" className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-5">
        <h2 id="scorecard-title" className="type-h3 whitespace-nowrap">
          Instant scorecard
        </h2>
        {scorecard && (
          <span className="shrink-0 font-mono text-[13px] leading-[18px] text-ink-secondary">
            {timing(scorecard, submittedAt)}
          </span>
        )}
      </div>
      {scorecard ? (
        <ScorecardBody scorecard={scorecard} error={error} />
      ) : (
        <div className="border-t-2 border-ink pt-4 text-[15px] leading-[22px] text-ink-secondary">
          {status === "failed" ? (
            <>
              <p>We couldn't score this site automatically.</p>
              {error && <p className="mt-1 font-mono text-xs">{error}</p>}
            </>
          ) : (
            <p className="motion-safe:animate-pulse">Scoring…</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          variant="outline"
          className="w-full disabled:opacity-100"
          disabled
          aria-describedby="full-critique-note"
        >
          Request a full written critique
        </Button>
        <p id="full-critique-note" className="font-mono text-xs leading-4 text-ink-secondary">
          Full written critiques are coming soon.
        </p>
      </div>
    </section>
  );
}

function ScorecardBody({ scorecard, error }: { scorecard: ScorecardDoc; error?: string }) {
  // Group while keeping the stored (focus-first) order.
  const groups: DimensionGroup[] = [];
  for (const d of scorecard.dimensions) {
    const g = dimensionGroup(d.dimension);
    if (!groups.includes(g)) groups.push(g);
  }

  // Lowest score first; ties keep display order, so a dimension they asked about wins.
  const byScore = scorecard.dimensions.toSorted(
    (a, b) => a.score / a.maxScore - b.score / b.maxScore,
  );
  const weakest = byScore[0]?.dimension;
  const weakestRow = scorecard.dimensions.find((d) => d.dimension === weakest);
  const rest = scorecard.dimensions.filter((d) => d.dimension !== weakest);
  const restAreClose = rest.every((d) => d.score / d.maxScore >= 0.6);
  const runnerUp = byScore.find((d) => d.dimension !== weakest);

  return (
    <>
      {groups.map((group) => {
        const rows = scorecard.dimensions.filter((d) => dimensionGroup(d.dimension) === group);
        const asked = rows.some((d) => d.weight > 1);
        return (
          <div key={group} className="flex flex-col pb-9">
            <div className="flex items-center justify-between gap-3 border-t-2 border-ink py-3.5">
              <h3 className="font-sans text-base leading-6 font-bold">{GROUP_TITLES[group]}</h3>
              {asked && (
                <span className="bg-note px-2.5 py-[3px] text-xs leading-[18px] font-bold">
                  You asked about this
                </span>
              )}
            </div>
            <ul>
              {rows.map((d) => (
                <ScoreRow key={d.dimension} row={d} weakest={d.dimension === weakest} />
              ))}
            </ul>
          </div>
        );
      })}
      {weakestRow && weakestRow.score < weakestRow.maxScore && (
        <p className="type-hand origin-center -rotate-2 pb-5 text-primary">
          ↑ start with “{ROW_LABELS[weakestRow.dimension].toLowerCase()}”.{" "}
          {restAreClose || !runnerUp
            ? "Everything else is close."
            : `Then “${ROW_LABELS[runnerUp.dimension].toLowerCase()}”.`}
        </p>
      )}
      {error && (
        <p className="pb-4 font-mono text-xs leading-4 text-ink-secondary">
          Last re-audit failed: {error}
        </p>
      )}
    </>
  );
}

function ScoreRow({ row, weakest }: { row: DimensionRow; weakest: boolean }) {
  const pct = Math.max(0, Math.min(1, row.score / row.maxScore)) * 100;
  return (
    <li className="flex items-center py-3">
      <span
        className={cn(
          "min-w-0 flex-1 pr-4 text-[15px] leading-[22px]",
          weakest ? "font-bold text-primary" : "font-medium",
        )}
      >
        {ROW_LABELS[row.dimension]}
        <span className="sr-only">
          : {row.level}, {row.score} of {row.maxScore}
          {weakest ? ", weakest" : ""}
        </span>
      </span>
      <span aria-hidden className="flex h-2.5 w-[120px] shrink-0 bg-rule sm:w-40">
        <span
          className={cn("h-full", weakest ? "bg-primary" : "bg-ink")}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span
        aria-hidden
        className={cn(
          "w-14 shrink-0 text-right font-mono text-sm leading-5 font-bold tabular-nums",
          weakest && "text-primary",
        )}
      >
        {outOfTen(row)}
      </span>
    </li>
  );
}
