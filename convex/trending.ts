import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { REAUDIT_AFTER_MS } from "./lib/config";
import { TRENDING, trendingScore } from "./lib/trending";

const PAGE_SIZE = 100;

/** Recompute trending scores for in-dev sites, one page at a time. Run by cron. */
export const recompute = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { cursor }) => {
    const now = Date.now();
    const page = await ctx.db
      .query("sites")
      .withIndex("by_status_trending", (q) => q.eq("status", "in-dev"))
      .paginate({ cursor: cursor ?? null, numItems: PAGE_SIZE });

    for (const site of page.page) {
      const recent = await ctx.db
        .query("critiques")
        .withIndex("by_site_created", (q) =>
          q.eq("siteId", site._id).gte("createdAt", now - TRENDING.critiqueWindowMs),
        )
        .collect();
      const critiqueTimestamps = recent
        .filter((c) => c.moderationStatus === "published" || c.moderationStatus === "flagged")
        .map((c) => c.createdAt);
      const score = trendingScore({
        clickHeat: site.clickHeat,
        clickHeatAt: site.clickHeatAt,
        critiqueTimestamps,
        now,
      });
      if (score !== site.trendingScore) {
        await ctx.db.patch(site._id, { trendingScore: score });
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.trending.recompute, { cursor: page.continueCursor });
    }
  },
});

/** Queue fresh scorecards for in-dev sites whose latest one is stale. Run by cron. */
export const scheduleReaudits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_status_trending", (q) => q.eq("status", "in-dev"))
      .take(500);
    let queued = 0;
    for (const site of sites) {
      const latest = await ctx.db
        .query("scorecards")
        .withIndex("by_site_created", (q) => q.eq("siteId", site._id))
        .order("desc")
        .first();
      if (latest && now - latest.createdAt < REAUDIT_AFTER_MS) continue;
      // Stagger so we don't hit every site (or the provider) at once.
      await ctx.scheduler.runAfter(queued * 2_000, internal.judge.scoreSite, { siteId: site._id });
      queued++;
    }
    return queued;
  },
});
