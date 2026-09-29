import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { makeMockProvider } from "../convex/judgment/mock";
import { JudgmentProvider } from "../convex/judgment/provider";
import {
  buildScorecard,
  composeScorecard,
  DIMENSIONS,
  type DimensionScore,
  dimensionWeights,
  orderDimensions,
  SCORE_LEVELS,
} from "../convex/judgment/scorecard";
import { extractSiteMetrics } from "../convex/judgment/siteMetrics";

const GOOD_SITE = `<!doctype html>
<html lang="en">
<head>
  <title>Jane Doe — brand designer</title>
  <meta name="description" content="Brand designer for small studios.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body { font-family: "Inter", sans-serif; color: #111; background: #fff } h1 { font-family: "Fraunces"; color: #e8112d }</style>
</head>
<body>
  <h1>Hi, I'm Jane</h1>
  <p>I'm a brand designer with ten years of experience. Previously I worked at two studios and
  now help founders find their voice. Clients include small coffee roasters and bookshops.</p>
  <h2>Work</h2>
  <img src="a.png" alt="Packaging for a coffee roaster">
  <h2>Contact</h2>
  <a href="mailto:jane@example.com">Email me</a>
</body>
</html>`;

const BARE_SITE = `<html><body><div>under construction</div><img src="x.png"></body></html>`;

const withMock = Layer.succeed(JudgmentProvider, makeMockProvider());

const raw = (scores: Partial<Record<(typeof DIMENSIONS)[number], number>>) =>
  DIMENSIONS.map((dimension) => ({
    dimension,
    level: SCORE_LEVELS[(scores[dimension] ?? 3) - 1]!,
    score: scores[dimension] ?? 3,
    maxScore: SCORE_LEVELS.length,
    confidence: 0.8,
  }));

describe("dimensionWeights", () => {
  it("weights everything equally for `overall`", () => {
    const w = dimensionWeights(["overall"]);
    expect(new Set(Object.values(w))).toEqual(new Set([1]));
  });

  it("boosts the dimensions a focus covers", () => {
    const w = dimensionWeights(["design"]);
    expect(w.visualHierarchy).toBe(2);
    expect(w.typography).toBe(2);
    expect(w.clarity).toBe(1);
  });

  it("stacks overlapping focuses and ignores duplicates", () => {
    const w = dimensionWeights(["selling-myself", "background", "background"]);
    expect(w.clarity).toBe(3); // covered by both
    expect(w.background).toBe(2);
    expect(w.typography).toBe(1);
  });
});

describe("orderDimensions", () => {
  const items = DIMENSIONS.map((dimension) => ({ dimension }));

  it("keeps the canonical order (sell group, then craft) for `overall`", () => {
    expect(orderDimensions(items, ["overall"]).map((d) => d.dimension)).toEqual([...DIMENSIONS]);
  });

  it("puts the requested focus first", () => {
    const order = orderDimensions(items, ["design"]).map((d) => d.dimension);
    expect(order.slice(0, 2)).toEqual(["visualHierarchy", "typography"]);
    expect(order[2]).toBe("clarity");
  });

  it("does not mutate its input", () => {
    const copy = [...items];
    orderDimensions(items, ["design"]);
    expect(items).toEqual(copy);
  });
});

describe("composeScorecard", () => {
  it("normalizes the overall score to 0..1", () => {
    const all5 = composeScorecard("mock", raw(Object.fromEntries(DIMENSIONS.map((d) => [d, 5]))), [
      "overall",
    ]);
    const all1 = composeScorecard("mock", raw(Object.fromEntries(DIMENSIONS.map((d) => [d, 1]))), [
      "overall",
    ]);
    expect(all5.overall).toBe(1);
    expect(all1.overall).toBe(0);
  });

  it("weights requested dimensions more heavily in the overall score", () => {
    const scores = raw({ visualHierarchy: 1, typography: 1 });
    const neutral = composeScorecard("mock", scores, ["overall"]);
    const design = composeScorecard("mock", scores, ["design"]);
    expect(design.overall).toBeLessThan(neutral.overall);
  });

  it("orders dimensions by the site's help-wanted and records weights", () => {
    const card = composeScorecard("mock", raw({}), ["background"]);
    // Both boosted dimensions lead; ties keep the canonical order.
    expect(card.dimensions[0]).toMatchObject({ dimension: "clarity", weight: 2 });
    expect(card.dimensions[1]).toMatchObject({ dimension: "background", weight: 2 });
    expect(card.dimensions[2]).toMatchObject({ weight: 1 });
  });

  it("focuses the deep audit on the biggest weighted gaps below 'good'", () => {
    const card = composeScorecard(
      "mock",
      raw({ typography: 2, callToAction: 1, visualHierarchy: 4 }),
      ["design"],
    );
    // typography (gap .75 x2) beats callToAction (gap 1 x1); "good" (4) is skipped;
    // then the first "fair" (3) dimension in display order.
    expect(card.focus).toEqual(["typography", "callToAction", "clarity"]);
  });

  it("gives confidence-zero dimensions no say", () => {
    const dims: Omit<DimensionScore, "weight">[] = raw({}).map((d) =>
      d.dimension === "accessibility" ? { ...d, score: 1, confidence: 0 } : d,
    );
    expect(composeScorecard("mock", dims, ["overall"]).overall).toBe(0.5);
  });
});

const build = (html: string, helpWanted: ("overall" | "design" | "selling-myself")[]) =>
  Effect.runPromise(
    buildScorecard({
      url: "https://jane.dev",
      title: "Jane Doe",
      helpWanted,
      metrics: extractSiteMetrics(html),
    }).pipe(Effect.provide(withMock)),
  );

describe("buildScorecard with the mock provider", () => {
  it("scores all eight dimensions", async () => {
    const card = await build(GOOD_SITE, ["overall"]);
    expect(card.provider).toBe("mock");
    expect(card.dimensions.map((d) => d.dimension).toSorted()).toEqual([...DIMENSIONS].toSorted());
    for (const d of card.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(1);
      expect(d.score).toBeLessThanOrEqual(5);
      expect(d.level).toBe(SCORE_LEVELS[d.score - 1]);
    }
  });

  it("scores a considered site above a bare one", async () => {
    const good = await build(GOOD_SITE, ["overall"]);
    const bare = await build(BARE_SITE, ["overall"]);
    expect(good.overall).toBeGreaterThan(bare.overall);
  });

  it("is deterministic", async () => {
    expect(await build(GOOD_SITE, ["design"])).toEqual(await build(GOOD_SITE, ["design"]));
  });

  it("shows the requested focus first", async () => {
    const card = await build(GOOD_SITE, ["selling-myself"]);
    expect(card.dimensions.slice(0, 3).map((d) => d.dimension)).toEqual([
      "clarity",
      "memorability",
      "callToAction",
    ]);
  });
});

describe("extractSiteMetrics on hostile HTML", () => {
  it("ignores script and style contents, and drops everything after an unclosed <script>", () => {
    const m = extractSiteMetrics(
      `<title>Jane</title><p>Hello there</p><style>p { color: #f00 }</style>` +
        `<script>var s = "<p>not visible</p>"</script><p>friend</p><script>never closed <p>lost words`,
    );
    expect(m.title).toBe("Jane");
    expect(m.wordCount).toBe(4); // "Jane Hello there friend"
    expect(m.colorCount).toBe(1);
  });

  it("doesn't treat custom elements like <script-foo> as script or style", () => {
    const m = extractSiteMetrics(
      `<script-foo>visible words</script-foo><style-x>color: #123</style-x><p>after</p>`,
    );
    expect(m.wordCount).toBe(5); // "visible words color: #123 after"
    expect(m.colorCount).toBe(0);
    // Real script and style elements still end at whitespace, "/" or ">".
    const real = extractSiteMetrics(
      `<script type="module">hidden()</script><style\n>p { color: #abc }</style><p>shown</p>`,
    );
    expect(real.wordCount).toBe(1);
    expect(real.colorCount).toBe(1);
  });

  it("keeps text after a literal < that doesn't start a tag", () => {
    const m = extractSiteMetrics(
      "<p>Hi, I'm Jane. If 1 < 2 then I have years of experience with clients",
    );
    expect(m.backgroundMentions).toBe(3); // years, experience, clients
  });

  it("stays linear on 1 MB of text full of literal <", () => {
    const html = "a < b ".repeat(Math.floor(1_000_000 / 6));
    const start = performance.now();
    const m = extractSiteMetrics(html);
    expect(performance.now() - start).toBeLessThan(2000);
    expect(m.wordCount).toBe(3 * Math.floor(1_000_000 / 6)); // nothing dropped
  }, 10_000);

  it("still reads tags and links", () => {
    const m = extractSiteMetrics(GOOD_SITE);
    expect(m).toMatchObject({
      title: "Jane Doe — brand designer",
      hasMetaDescription: true,
      hasViewportMeta: true,
      hasLang: true,
      imageCount: 1,
      imagesWithAlt: 1,
      linkCount: 1,
      hasContactLink: true,
    });
    expect(extractSiteMetrics(BARE_SITE)).toMatchObject({
      hasLang: false,
      imagesWithAlt: 0,
      hasContactLink: false,
    });
  });

  it.each(["<script>", "<style>x", "<title>", "<a ", "<meta ", "<img ", 'href="', ' style="'])(
    "stays linear on 1 MB of unclosed %j",
    (unit) => {
      const html = unit.repeat(Math.floor(1_000_000 / unit.length));
      const start = performance.now();
      extractSiteMetrics(html);
      // Linear passes take tens of ms; the old regexes took minutes on some of these.
      expect(performance.now() - start).toBeLessThan(2000);
    },
    10_000,
  );
});
