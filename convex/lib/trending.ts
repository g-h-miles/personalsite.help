/**
 * Trending score: time-decayed clicks + critique velocity.
 *
 * Pure and dependency-free so it can be unit tested and tuned in one place.
 *
 * - Clicks are tracked as an exponentially decayed counter ("heat") on the
 *   site document, so recording a click is O(1) and no click log is needed.
 * - Critique velocity is the sum of recent critiques, each decayed by age, so
 *   a site that is actively getting feedback rises even with few clicks.
 */

const HOUR = 60 * 60 * 1000;

export interface TrendingConfig {
  clickHalfLifeMs: number;
  critiqueHalfLifeMs: number;
  critiqueWindowMs: number;
  critiqueWeight: number;
}

export const TRENDING: Readonly<TrendingConfig> = {
  /** A click loses half its weight every 24h. */
  clickHalfLifeMs: 24 * HOUR,
  /** A critique loses half its weight every 72h. */
  critiqueHalfLifeMs: 72 * HOUR,
  /** Critiques older than this are ignored entirely. */
  critiqueWindowMs: 14 * 24 * HOUR,
  /** One fresh critique is worth this many fresh clicks. */
  critiqueWeight: 5,
};

/** Decay `value` measured at `fromMs` to its equivalent at `toMs`. */
export function decay(value: number, fromMs: number, toMs: number, halfLifeMs: number): number {
  const elapsed = Math.max(0, toMs - fromMs);
  return value * Math.pow(0.5, elapsed / halfLifeMs);
}

/** New click heat after one click at `nowMs`. */
export function bumpClickHeat(
  heat: number,
  heatAtMs: number,
  nowMs: number,
  halfLifeMs: number = TRENDING.clickHalfLifeMs,
): number {
  return decay(heat, heatAtMs, nowMs, halfLifeMs) + 1;
}

export interface TrendingInput {
  clickHeat: number;
  clickHeatAt: number;
  /** Creation times of visible critiques (any order). */
  critiqueTimestamps: readonly number[];
  now: number;
}

export function critiqueVelocity(
  critiqueTimestamps: readonly number[],
  now: number,
  config: Pick<TrendingConfig, "critiqueHalfLifeMs" | "critiqueWindowMs"> = TRENDING,
): number {
  let total = 0;
  for (const t of critiqueTimestamps) {
    if (now - t > config.critiqueWindowMs || t > now) continue;
    total += decay(1, t, now, config.critiqueHalfLifeMs);
  }
  return total;
}

export function trendingScore(input: TrendingInput, config: TrendingConfig = TRENDING): number {
  const clicks = decay(input.clickHeat, input.clickHeatAt, input.now, config.clickHalfLifeMs);
  const velocity = critiqueVelocity(input.critiqueTimestamps, input.now, config);
  const score = clicks + config.critiqueWeight * velocity;
  // Round to keep the index stable against float noise.
  return Math.round(score * 1000) / 1000;
}
