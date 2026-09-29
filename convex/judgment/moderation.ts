/**
 * Comment moderation on top of the `yesNo` primitive.
 *
 * Three judgments per critique — abusive? substantive? on-topic? — mapped to:
 * - `held`      high-confidence junk (hidden)
 * - `published` confidently fine (live immediately)
 * - `flagged`   the uncertain middle (live, but marked and reportable)
 *
 * Rate limits sit underneath this regardless (see convex/critiques.ts); the
 * model is the quality layer, not the only layer.
 */
import { Effect } from "effect";
import { JudgmentProvider, type JudgmentError, type ProviderName } from "./provider";

export const MODERATION_THRESHOLDS = {
  /** Hold if P(abusive) is at least this. */
  holdAbusive: 0.85,
  /** Hold if P(substantive) is at most this. */
  holdNotSubstantive: 0.15,
  /** Hold if P(on-topic) is at most this. */
  holdOffTopic: 0.15,
  /** Publish cleanly only if P(abusive) is at most this… */
  publishMaxAbusive: 0.2,
  /** …and P(substantive) is at least this… */
  publishMinSubstantive: 0.6,
  /** …and P(on-topic) is at least this. */
  publishMinOnTopic: 0.6,
} as const;

export interface ModerationSignals {
  abusive: number;
  substantive: number;
  onTopic: number;
}

export type ModerationDecision = "published" | "flagged" | "held";

/** Pure threshold logic. */
export function decideModeration(
  s: ModerationSignals,
  t: typeof MODERATION_THRESHOLDS = MODERATION_THRESHOLDS,
): ModerationDecision {
  if (
    s.abusive >= t.holdAbusive ||
    s.substantive <= t.holdNotSubstantive ||
    s.onTopic <= t.holdOffTopic
  ) {
    return "held";
  }
  if (
    s.abusive <= t.publishMaxAbusive &&
    s.substantive >= t.publishMinSubstantive &&
    s.onTopic >= t.publishMinOnTopic
  ) {
    return "published";
  }
  return "flagged";
}

export interface CritiqueText {
  siteTitle: string;
  siteUrl: string;
  firstImpression: string;
  sellsThem: string;
  oneThingToFix: string;
  whatWorks: string;
}

export function critiqueContext(c: CritiqueText): string {
  return [
    `Feedback on the personal website "${c.siteTitle}" (${c.siteUrl}).`,
    `First impression: ${c.firstImpression}`,
    `Does it sell them / what do they do: ${c.sellsThem}`,
    `One thing to fix: ${c.oneThingToFix}`,
    `What works: ${c.whatWorks}`,
  ].join("\n");
}

/** The text the judgments are asked about (without the site framing line). */
function critiqueBody(c: CritiqueText): string {
  return [c.firstImpression, c.sellsThem, c.oneThingToFix, c.whatWorks].join("\n");
}

export interface ModerationResult extends ModerationSignals {
  provider: ProviderName;
  decision: ModerationDecision;
}

export const moderateCritique = (
  critique: CritiqueText,
): Effect.Effect<ModerationResult, JudgmentError, JudgmentProvider> =>
  Effect.gen(function* () {
    const provider = yield* JudgmentProvider;
    const framed = critiqueContext(critique);
    const body = critiqueBody(critique);
    const { abusive, substantive, onTopic } = yield* Effect.all(
      {
        abusive: provider.yesNo({
          key: "moderation.abusive",
          question: "Is this comment abusive, harassing, hateful or insulting toward a person?",
          context: body,
        }),
        substantive: provider.yesNo({
          key: "moderation.substantive",
          question:
            "Does this comment give specific, actionable or thoughtful feedback (not just empty praise or a one-word reaction)?",
          context: body,
        }),
        onTopic: provider.yesNo({
          key: "moderation.onTopic",
          question:
            "Is this comment feedback about the website described, rather than spam, self-promotion or an unrelated topic?",
          context: framed,
        }),
      },
      { concurrency: "unbounded" },
    );
    const signals = {
      abusive: abusive.probability,
      substantive: substantive.probability,
      onTopic: onTopic.probability,
    };
    return { ...signals, provider: provider.name, decision: decideModeration(signals) };
  });
