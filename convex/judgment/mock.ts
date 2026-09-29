/**
 * Deterministic mock judgment provider.
 *
 * Used by default (no API keys needed) and in tests. Same input → same output.
 *
 * Known judgment keys get simple heuristics so local development feels
 * plausible (junk comments get held, sites with no alt text score low on
 * accessibility). Unknown keys fall back to a stable hash of key + context.
 * Tests can override any key with `rules`.
 */
import { Effect } from "effect";
import type {
  ChoiceRequest,
  ChoiceResult,
  JudgmentProviderService,
  ScoreRequest,
  YesNoRequest,
} from "./provider";
import type { SiteMetrics } from "./siteMetrics";

export interface MockRules {
  yesNo?: Record<string, (request: YesNoRequest) => number>;
  /** Return a 0..1 position on the scale (0 = worst level) and confidence. */
  score?: Record<
    string,
    (request: ScoreRequest<string>) => { position: number; confidence: number }
  >;
  /** Return a distribution over the request's options. */
  choice?: Record<string, (request: ChoiceRequest<string>) => Record<string, number>>;
}

/** FNV-1a → [0, 1). */
export function stableUnit(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// ---------------------------------------------------------------------------
// Default heuristics
// ---------------------------------------------------------------------------

const ABUSIVE =
  /\b(idiot|stupid|moron|trash|garbage|retard\w*|kys|kill yourself|f+u+c+k\w*|shit\w*)\b/i;
const SPAM =
  /\b(casino|crypto|airdrop|viagra|buy now|discount code|promo code|followers|seo services)\b/i;
const EMPTY_PRAISE =
  /^(looks? (clean|good|great|nice|sick)|nice|cool|love it|great|fire|lgtm)[!. 🔥]*$/iu;

function words(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const defaultYesNo: Record<string, (request: YesNoRequest) => number> = {
  "moderation.abusive": ({ context }) => (ABUSIVE.test(context) ? 0.95 : 0.03),
  "moderation.onTopic": ({ context }) => (SPAM.test(context) ? 0.05 : 0.92),
  "moderation.substantive": ({ context }) => {
    // Context is one line per structured field.
    const lines = context.split("\n").map((l) => l.trim());
    const n = words(context);
    if (n < 12 || lines.every((l) => EMPTY_PRAISE.test(l) || words(l) < 3)) return 0.05;
    if (n >= 25) return 0.9;
    return 0.5;
  },
};

function parseMetrics(context: string): SiteMetrics | null {
  try {
    const parsed = JSON.parse(context) as { metrics?: SiteMetrics };
    return parsed.metrics ?? null;
  } catch {
    return null;
  }
}

function metricsScore(
  heuristic: (m: SiteMetrics) => number,
): (request: ScoreRequest<string>) => { position: number; confidence: number } {
  return (request) => {
    const metrics = parseMetrics(request.context);
    if (!metrics) return { position: stableUnit(request.key + request.context), confidence: 0.2 };
    return { position: clamp01(heuristic(metrics)), confidence: 0.6 };
  };
}

const defaultScore: NonNullable<MockRules["score"]> = {
  // Does it sell you
  "scorecard.clarity": metricsScore(
    (m) =>
      (m.hasFirstPersonIntro ? 0.5 : 0.1) +
      (m.h1Count === 1 ? 0.3 : 0) +
      (m.title && m.title.length >= 5 && m.title.length <= 70 ? 0.2 : 0),
  ),
  "scorecard.background": metricsScore((m) => Math.min(1, 0.15 + m.backgroundMentions * 0.12)),
  "scorecard.memorability": metricsScore(
    (m) =>
      (m.hasFirstPersonIntro ? 0.35 : 0.1) +
      (m.fontFamilyCount >= 1 && m.fontFamilyCount <= 3 ? 0.25 : 0.1) +
      (m.colorCount >= 2 && m.colorCount <= 10 ? 0.25 : 0.1),
  ),
  "scorecard.callToAction": metricsScore((m) => (m.hasContactLink ? 0.8 : 0.2)),
  // Craft
  "scorecard.visualHierarchy": metricsScore(
    (m) =>
      (m.h1Count === 1 ? 0.5 : 0.1) +
      (m.headingCount >= 2 && m.headingCount <= 30 ? 0.3 : 0) +
      (m.headingLevelsSkipped ? 0 : 0.2),
  ),
  "scorecard.typography": metricsScore((m) =>
    m.fontFamilyCount === 0 ? 0.5 : m.fontFamilyCount <= 3 ? 0.8 : 0.3,
  ),
  "scorecard.copyQuality": metricsScore(
    (m) =>
      (m.wordCount >= 50 && m.wordCount <= 2000 ? 0.6 : 0.25) +
      (m.hasMetaDescription ? 0.2 : 0) +
      (m.title && m.title.length >= 5 && m.title.length <= 70 ? 0.2 : 0),
  ),
  "scorecard.accessibility": metricsScore((m) => {
    const alt = m.imageCount === 0 ? 1 : m.imagesWithAlt / m.imageCount;
    const labels = m.inputCount === 0 ? 1 : Math.min(1, m.labelCount / m.inputCount);
    return (Number(m.hasLang) + alt + Number(m.hasViewportMeta) + labels) / 4;
  }),
};

// ---------------------------------------------------------------------------

export function makeMockProvider(rules: MockRules = {}): JudgmentProviderService {
  const yesNoRules = { ...defaultYesNo, ...rules.yesNo };
  const scoreRules = { ...defaultScore, ...rules.score };
  const choiceRules = { ...rules.choice };

  return {
    name: "mock",

    yesNo: (request) =>
      Effect.sync(() => {
        const rule = yesNoRules[request.key];
        const probability = rule ? rule(request) : stableUnit(request.key + request.context);
        return { probability: clamp01(probability) };
      }),

    score: <L extends string>(request: ScoreRequest<L>) =>
      Effect.sync(() => {
        const rule = scoreRules[request.key];
        const { position, confidence } = rule
          ? rule(request)
          : { position: stableUnit(request.key + request.context), confidence: 0.2 };
        const index = Math.round(clamp01(position) * (request.levels.length - 1));
        return { level: request.levels[index]!, index, confidence: clamp01(confidence) };
      }),

    choice: <A extends string>(request: ChoiceRequest<A>) =>
      Effect.sync((): ChoiceResult<A> => {
        const rule = choiceRules[request.key];
        const raw: Record<string, number> = rule
          ? rule(request)
          : Object.fromEntries(
              request.options.map((o) => [o, stableUnit(request.key + o + request.context)]),
            );
        const total = request.options.reduce((sum, o) => sum + (raw[o] ?? 0), 0) || 1;
        const distribution = Object.fromEntries(
          request.options.map((o) => [o, (raw[o] ?? 0) / total]),
        ) as Record<A, number>;
        const choice = request.options.reduce((best, o) =>
          distribution[o] > distribution[best] ? o : best,
        );
        return { choice, distribution };
      }),
  };
}
