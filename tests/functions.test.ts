// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { RECIPROCITY_CRITIQUES_REQUIRED } from "../convex/lib/config";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.*s");

const SITE_HTML = `<html lang="en"><head><title>Site</title></head><body><h1>Hi, I'm Test</h1></body></html>`;

const goodCritique = {
  firstImpression: "Strong name and headline, but the page is very sparse below the fold.",
  sellsThem: "I think they are a product designer, though I had to guess from the project list.",
  oneThingToFix: "Add one sentence under the headline saying what you do and for whom.",
  whatWorks: "The project titles are specific and make me want to click through.",
};

function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "user_alice", name: "Alice" });
  const bob = t.withIdentity({ subject: "user_bob", name: "Bob" });
  return { t, alice, bob };
}

/** Insert a site directly, bypassing the reciprocity gate, for critique targets. */
async function seedSite(t: ReturnType<typeof convexTest>, owner: string, url: string) {
  return await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", { clerkId: owner, displayName: owner, roles: [] });
    const now = Date.now();
    return await ctx.db.insert("sites", {
      url,
      normalizedUrl: url.replace(/^https?:\/\//, ""),
      title: `${owner}'s site`,
      ownerId,
      helpWanted: ["overall"],
      status: "in-dev",
      verificationMethod: "badge",
      verified: false,
      submittedAt: now,
      clickCount: 0,
      clickHeat: 0,
      clickHeatAt: now,
      trendingScore: 0,
      critiqueCount: 0,
      scorecardStatus: "pending",
    });
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(SITE_HTML, { status: 200 })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("sites.submit", () => {
  it("requires sign-in", async () => {
    const { t } = setup();
    await expect(
      t.mutation(api.sites.submit, {
        url: "https://alice.dev",
        title: "Alice",
        helpWanted: ["overall"],
        verificationMethod: "badge",
      }),
    ).rejects.toThrow(/sign in/i);
  });

  it("enforces the reciprocity gate, then scores the site", async () => {
    const { t, alice } = setup();
    const submit = () =>
      alice.mutation(api.sites.submit, {
        url: "https://alice.dev",
        title: "Alice — designer",
        helpWanted: ["selling-myself", "design"],
        context: "Applying to product design roles",
        verificationMethod: "badge",
      });

    if (RECIPROCITY_CRITIQUES_REQUIRED > 0) {
      await expect(submit()).rejects.toThrow(/critiques before posting/);
      for (let i = 0; i < RECIPROCITY_CRITIQUES_REQUIRED; i++) {
        const target = await seedSite(t, `owner_${i}`, `https://owner${i}.dev`);
        await alice.mutation(api.critiques.submit, { siteId: target, ...goodCritique });
      }
    }

    const siteId = await submit();
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const profile = await t.query(api.sites.get, { siteId });
    expect(profile?.site.helpWanted).toEqual(["selling-myself", "design"]);
    expect(profile?.site.scorecardStatus).toBe("ready");
    expect(profile?.scorecard?.provider).toBe("mock");
    // Requested focus leads the scorecard.
    expect(profile?.scorecard?.dimensions[0]?.weight).toBeGreaterThan(1);
  });
});

describe("critiques", () => {
  it("accepts anonymous critiques and publishes them after moderation", async () => {
    const { t } = setup();
    const siteId = await seedSite(t, "carol", "https://carol.dev");
    await t.mutation(api.critiques.submit, { siteId, ...goodCritique });

    let profile = await t.query(api.sites.get, { siteId });
    expect(profile?.critiques).toHaveLength(0); // pending moderation

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    profile = await t.query(api.sites.get, { siteId });
    expect(profile?.critiques).toHaveLength(1);
    expect(profile?.critiques[0]?.author).toBeNull();
    expect(profile?.site.critiqueCount).toBe(1);
  });

  it("holds junk", async () => {
    const { t } = setup();
    const siteId = await seedSite(t, "dave", "https://dave.dev");
    await t.mutation(api.critiques.submit, {
      siteId,
      firstImpression: "looks clean 🔥",
      sellsThem: "yes",
      oneThingToFix: "nah",
      whatWorks: "all",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const profile = await t.query(api.sites.get, { siteId });
    expect(profile?.critiques).toHaveLength(0);
  });

  it("toggles upvotes for signed-in users", async () => {
    const { t, bob } = setup();
    const siteId = await seedSite(t, "erin", "https://erin.dev");
    const critiqueId: Id<"critiques"> = await t.mutation(api.critiques.submit, {
      siteId,
      ...goodCritique,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    await expect(t.mutation(api.critiques.toggleUpvote, { critiqueId })).rejects.toThrow(
      /sign in/i,
    );
    expect(await bob.mutation(api.critiques.toggleUpvote, { critiqueId })).toEqual({
      upvoted: true,
    });
    const profile = await bob.query(api.sites.get, { siteId });
    expect(profile?.critiques[0]).toMatchObject({ upvoteCount: 1, viewerHasUpvoted: true });
    expect(await bob.mutation(api.critiques.toggleUpvote, { critiqueId })).toEqual({
      upvoted: false,
    });
  });
});

describe("sites.graduate", () => {
  it("only lets the owner graduate, and moves the site to the archive", async () => {
    const { t, alice, bob } = setup();
    const siteId = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", {
        clerkId: "user_alice",
        displayName: "Alice",
        roles: [],
      });
      const now = Date.now();
      return await ctx.db.insert("sites", {
        url: "https://alice.dev/",
        normalizedUrl: "alice.dev",
        title: "Alice",
        ownerId,
        helpWanted: ["overall"],
        status: "in-dev",
        verificationMethod: "badge",
        verified: false,
        submittedAt: now,
        clickCount: 0,
        clickHeat: 0,
        clickHeatAt: now,
        trendingScore: 0,
        critiqueCount: 0,
        scorecardStatus: "pending",
      });
    });

    await expect(bob.mutation(api.sites.graduate, { siteId })).rejects.toThrow(/owner/);
    await alice.mutation(api.sites.graduate, { siteId });

    expect(await t.query(api.sites.listTrending, {})).toHaveLength(0);
    const archive = await t.query(api.sites.listGraduated, {});
    expect(archive.map((s) => s._id)).toEqual([siteId]);
  });
});
