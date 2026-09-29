/**
 * Tier 1: the instant scorecard, built on the `score` primitive.
 *
 * Two groups of dimensions:
 * - "Does it sell you": clarity, background, memorability, callToAction
 * - "Craft": visualHierarchy, typography, copyQuality, accessibility
 *
 * The site's `helpWanted` decides emphasis: requested focuses are weighted up
 * and shown first (see `dimensionWeights` / `orderDimensions`, both pure).
 */
import { Effect } from "effect";
import { JudgmentProvider, type JudgmentError, type ProviderName } from "./provider";
import type { SiteMetrics } from "./siteMetrics";
import {
  DIMENSIONS,
  type Dimension,
  dimensionWeights,
  type HelpWanted,
  orderDimensions,
  SCORE_LEVELS,
  type ScoreLevel,
} from "./taxonomy";

export * from "./taxonomy";

const QUESTIONS: Record<Dimension, string> = {
  clarity:
    "Within a few seconds, how clearly does this personal site say who this person is and what they do?",
  background:
    "How well does this site communicate the person's background: experience, skills and work history?",
  memorability:
    "How memorable and distinctive is this site: does it have a voice that feels like a specific person?",
  callToAction:
    "How clear is the next step for a visitor who is interested (contact, hire, follow, read more)?",
  visualHierarchy:
    "How clear is this site's visual hierarchy: is it obvious what to read first, second and third?",
  typography:
    "How well-chosen and consistent is this site's typography (typeface count, scale, readability)?",
  copyQuality: "How clear, specific and well-edited is this site's copy?",
  accessibility:
    "How well does this site cover accessibility basics (language, alt text, labels, viewport, heading order)?",
};

export interface ScorecardInput {
  url: string;
  title: string;
  helpWanted: HelpWanted[];
  context?: string;
  audience?: string;
  metrics: SiteMetrics;
}

export interface DimensionScore {
  dimension: Dimension;
  level: ScoreLevel;
  /** 1-based. */
  score: number;
  maxScore: number;
  confidence: number;
  weight: number;
}

export interface Scorecard {
  provider: ProviderName;
  /** In display order (requested focus first). */
  dimensions: DimensionScore[];
  /** Mean of normalized scores weighted by weight x confidence, 0..1. */
  overall: number;
  /** Up to three weakest dimensions, most important first. For the tier-2 deep audit. */
  focus: Dimension[];
}

/** Pure: combine per-dimension scores into the ordered scorecard. */
export function composeScorecard(
  provider: ProviderName,
  raw: readonly Omit<DimensionScore, "weight">[],
  helpWanted: readonly HelpWanted[],
): Scorecard {
  const weights = dimensionWeights(helpWanted);
  const dimensions = orderDimensions(
    raw.map((d) => ({ ...d, weight: weights[d.dimension] })),
    helpWanted,
  );

  const normalized = (d: DimensionScore) => (d.maxScore > 1 ? (d.score - 1) / (d.maxScore - 1) : 0);
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight * d.confidence, 0);
  const overall =
    totalWeight > 0
      ? dimensions.reduce((sum, d) => sum + normalized(d) * d.weight * d.confidence, 0) /
        totalWeight
      : 0;

  const focus = dimensions
    // Only point the deep audit at things below "good"…
    .filter((d) => d.score < d.maxScore - 1)
    // …biggest weighted gap first.
    .map((d) => ({ d, gap: (1 - normalized(d)) * d.weight }))
    .toSorted((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map(({ d }) => d.dimension);

  return { provider, dimensions, overall: Math.round(overall * 1000) / 1000, focus };
}

export const buildScorecard = (
  input: ScorecardInput,
): Effect.Effect<Scorecard, JudgmentError, JudgmentProvider> =>
  Effect.gen(function* () {
    const provider = yield* JudgmentProvider;
    const context = JSON.stringify(input);
    const raw = yield* Effect.forEach(
      DIMENSIONS,
      (dimension) =>
        provider
          .score({
            key: `scorecard.${dimension}`,
            question: QUESTIONS[dimension],
            context,
            levels: SCORE_LEVELS,
          })
          .pipe(
            Effect.map((result) => ({
              dimension,
              level: result.level,
              score: result.index + 1,
              maxScore: SCORE_LEVELS.length,
              confidence: result.confidence,
            })),
          ),
      { concurrency: "unbounded" },
    );
    return composeScorecard(provider.name, raw, input.helpWanted);
  });
