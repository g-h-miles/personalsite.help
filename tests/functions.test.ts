// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
  CLICK_DEDUPE_WINDOW_MS,
  CONTEXT_MAX,
  RECIPROCITY_CRITIQUES_REQUIRED,
} from "../convex/lib/config";
import { SCORECARD_ERRORS } from "../convex/sites";
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
      // Pending critiques don't count until moderation publishes them.
      await expect(submit()).rejects.toThrow(/you've given 0/);
      await t.finishAllScheduledFunctions(vi.runAllTimers);
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

describe("sites.submit validation", () => {
  it(`caps context at ${CONTEXT_MAX} characters`, async () => {
    const { t, alice } = setup();
    for (let i = 0; i < RECIPROCITY_CRITIQUES_REQUIRED; i++) {
      const target = await seedSite(t, `owner_${i}`, `https://owner${i}.dev`);
      await alice.mutation(api.critiques.submit, { siteId: target, ...goodCritique });
    }
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const submit = (context: string) =>
      alice.mutation(api.sites.submit, {
        url: "https://alice.dev",
        title: "Alice",
        helpWanted: ["overall"],
        context,
        verificationMethod: "badge",
      });
    await expect(submit("x".repeat(CONTEXT_MAX + 1))).rejects.toThrow(/at most 140/);
    await expect(submit("x".repeat(CONTEXT_MAX))).resolves.toBeDefined();
  });
});

describe("reciprocity", () => {
  it("counts only published critiques", async () => {
    const { t, alice } = setup();
    const given = async () => (await alice.query(api.sites.submitEligibility, {})).given;
    const target = await seedSite(t, "owner", "https://owner.dev");
    const critiqueId: Id<"critiques"> = await alice.mutation(api.critiques.submit, {
      siteId: target,
      ...goodCritique,
    });

    expect(await given()).toBe(0); // pending
    for (const status of ["flagged", "held"] as const) {
      await t.run((ctx) => ctx.db.patch(critiqueId, { moderationStatus: status }));
      expect(await given()).toBe(0);
    }
    await t.run((ctx) => ctx.db.patch(critiqueId, { moderationStatus: "published" }));
    expect(await given()).toBe(1);
  });
});

describe("scorecard failures", () => {
  it("shows a generic message and logs the raw error", async () => {
    const { t } = setup();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED 10.1.2.3:443");
      }),
    );
    const siteId = await seedSite(t, "frank", "https://frank.dev");
    await t.action(internal.judge.scoreSite, { siteId });

    const profile = await t.query(api.sites.get, { siteId });
    expect(profile?.site.scorecardStatus).toBe("failed");
    expect(profile?.site.scorecardError).toBe(SCORECARD_ERRORS.unreachable);
    expect(JSON.stringify(profile)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(errorLog.mock.calls)).toContain("ECONNREFUSED 10.1.2.3");
  });

  it("does not follow a redirect into a private address", async () => {
    const { t } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const siteId = await seedSite(t, "gina", "https://gina.dev");
    await t.action(internal.judge.scoreSite, { siteId });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const profile = await t.query(api.sites.get, { siteId });
    expect(profile?.site.scorecardError).toBe(SCORECARD_ERRORS.unreachable);
  });

  it("hides raw errors stored before this change", async () => {
    const { t } = setup();
    const siteId = await seedSite(t, "hana", "https://hana.dev");
    await t.run((ctx) =>
      ctx.db.patch(siteId, {
        scorecardStatus: "failed",
        scorecardError: "SiteFetchFailed: HTTP 403",
      }),
    );
    const profile = await t.query(api.sites.get, { siteId });
    expect(profile?.site.scorecardError).toBe(SCORECARD_ERRORS.failed);
  });
});

async function clicks(t: ReturnType<typeof convexTest>, siteId: Id<"sites">) {
  return (await t.query(api.sites.get, { siteId }))?.site.clickCount;
}

describe("sites.recordClick", () => {
  it("counts one click per anonymous visitor per window", async () => {
    const { t } = setup();
    const siteId = await seedSite(t, "ivy", "https://ivy.dev");
    const visitorId = "0f8c2a4e-7b1d-4c3e-9a6f-2d5b8e1c7a90";

    await t.mutation(api.sites.recordClick, { siteId, visitorId });
    await t.mutation(api.sites.recordClick, { siteId, visitorId });
    expect(await clicks(t, siteId)).toBe(1);

    await t.mutation(api.sites.recordClick, { siteId, visitorId: "another-visitor-id" });
    expect(await clicks(t, siteId)).toBe(2);

    vi.advanceTimersByTime(CLICK_DEDUPE_WINDOW_MS - 1000);
    await t.mutation(api.sites.recordClick, { siteId, visitorId });
    expect(await clicks(t, siteId)).toBe(2);

    vi.advanceTimersByTime(1000);
    await t.mutation(api.sites.recordClick, { siteId, visitorId });
    expect(await clicks(t, siteId)).toBe(3);
  });

  it("doesn't count clicks with no visitor, or with a malformed id", async () => {
    const { t } = setup();
    const siteId = await seedSite(t, "jo", "https://jo.dev");
    await t.mutation(api.sites.recordClick, { siteId });
    await t.mutation(api.sites.recordClick, { siteId, visitorId: "x" });
    await t.mutation(api.sites.recordClick, { siteId, visitorId: "a".repeat(65) });
    await t.mutation(api.sites.recordClick, { siteId, visitorId: "has spaces in it" });
    expect(await clicks(t, siteId)).toBe(0);
  });

  it("dedupes signed-in visitors by user, whatever anonymous id they send", async () => {
    const { t, bob } = setup();
    const siteId = await seedSite(t, "kim", "https://kim.dev");
    await t.run((ctx) =>
      ctx.db.insert("users", { clerkId: "user_bob", displayName: "Bob", roles: [] }),
    );

    await bob.mutation(api.sites.recordClick, { siteId, visitorId: "first-anon-id" });
    await bob.mutation(api.sites.recordClick, { siteId, visitorId: "second-anon-id" });
    await bob.mutation(api.sites.recordClick, { siteId });
    expect(await clicks(t, siteId)).toBe(1);
  });
});

describe("sites.pruneClicks", () => {
  it("deletes expired dedupe rows in bounded batches until none remain", async () => {
    const { t } = setup();
    const siteId = await seedSite(t, "lee", "https://lee.dev");
    const now = Date.now();
    await t.run(async (ctx) => {
      for (let i = 0; i < 1203; i++) {
        await ctx.db.insert("siteClicks", {
          siteId,
          visitor: `anon:stale-${i}`,
          countedAt: now - CLICK_DEDUPE_WINDOW_MS - 1000 - i,
        });
      }
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("siteClicks", {
          siteId,
          visitor: `anon:fresh-${i}`,
          countedAt: now - i * 1000,
        });
      }
    });
    const remaining = () =>
      t.run(async (ctx) => (await ctx.db.query("siteClicks").collect()).length);

    await t.mutation(internal.sites.pruneClicks, {});
    expect(await remaining()).toBe(1206 - 500); // one bounded batch per run

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const left = await t.run((ctx) => ctx.db.query("siteClicks").collect());
    expect(left.map((r) => r.visitor).toSorted()).toEqual([
      "anon:fresh-0",
      "anon:fresh-1",
      "anon:fresh-2",
    ]);
  });

  it("lets a visitor's click count again after their row is pruned", async () => {
    const { t } = setup();
    const siteId = await seedSite(t, "max", "https://max.dev");
    const visitorId = "prune-test-visitor";
    await t.mutation(api.sites.recordClick, { siteId, visitorId });
    vi.advanceTimersByTime(CLICK_DEDUPE_WINDOW_MS);
    await t.mutation(internal.sites.pruneClicks, {});
    expect(await t.run((ctx) => ctx.db.query("siteClicks").collect())).toHaveLength(0);
    await t.mutation(api.sites.recordClick, { siteId, visitorId });
    expect(await clicks(t, siteId)).toBe(2);
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
