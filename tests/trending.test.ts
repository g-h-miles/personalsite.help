import { describe, expect, it } from "vitest";
import {
  bumpClickHeat,
  critiqueVelocity,
  decay,
  TRENDING,
  trendingScore,
} from "../convex/lib/trending";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 8, 29, 12);

describe("decay", () => {
  it("halves a value after one half-life", () => {
    expect(decay(10, 0, TRENDING.clickHalfLifeMs, TRENDING.clickHalfLifeMs)).toBeCloseTo(5);
  });

  it("does not grow for timestamps in the future", () => {
    expect(decay(10, NOW, NOW - HOUR, DAY)).toBe(10);
  });
});

describe("bumpClickHeat", () => {
  it("adds one click on top of the decayed heat", () => {
    const heat = bumpClickHeat(4, NOW - TRENDING.clickHalfLifeMs, NOW);
    expect(heat).toBeCloseTo(3); // 4 → 2 after a half-life, +1
  });
});

describe("critiqueVelocity", () => {
  it("counts a fresh critique as ~1", () => {
    expect(critiqueVelocity([NOW], NOW)).toBeCloseTo(1);
  });

  it("ignores critiques outside the window and in the future", () => {
    expect(critiqueVelocity([NOW - TRENDING.critiqueWindowMs - 1, NOW + HOUR], NOW)).toBe(0);
  });

  it("weights recent critiques more than old ones", () => {
    expect(critiqueVelocity([NOW - HOUR], NOW)).toBeGreaterThan(
      critiqueVelocity([NOW - 5 * DAY], NOW),
    );
  });
});

describe("trendingScore", () => {
  const base = { clickHeat: 0, clickHeatAt: NOW, critiqueTimestamps: [], now: NOW };

  it("is zero for a site with no attention", () => {
    expect(trendingScore(base)).toBe(0);
  });

  it("decays clicks over time", () => {
    const fresh = trendingScore({ ...base, clickHeat: 10 });
    const stale = trendingScore({ ...base, clickHeat: 10, clickHeatAt: NOW - 3 * DAY });
    expect(fresh).toBe(10);
    expect(stale).toBeCloseTo(1.25, 2); // three half-lives
  });

  it("lets critique velocity lift a site with few clicks", () => {
    const clicksOnly = trendingScore({ ...base, clickHeat: 6 });
    const critiqued = trendingScore({
      ...base,
      clickHeat: 2,
      critiqueTimestamps: [NOW - HOUR, NOW - 2 * HOUR],
    });
    expect(critiqued).toBeGreaterThan(clicksOnly);
  });

  it("ranks yesterday's burst below today's steady activity", () => {
    const burstYesterday = trendingScore({ ...base, clickHeat: 20, clickHeatAt: NOW - 2 * DAY });
    const today = trendingScore({ ...base, clickHeat: 6, critiqueTimestamps: [NOW - HOUR] });
    expect(today).toBeGreaterThan(burstYesterday);
  });

  it("uses the injected config", () => {
    const score = trendingScore(
      { ...base, critiqueTimestamps: [NOW] },
      { ...TRENDING, critiqueWeight: 1 },
    );
    expect(score).toBeCloseTo(1);
  });
});
