import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { getViewer, requireViewer } from "./lib/auth";
import { AUDIENCE_MAX, CONTEXT_MAX, RECIPROCITY_CRITIQUES_REQUIRED } from "./lib/config";
import { bumpClickHeat } from "./lib/trending";
import { normalizeSiteUrl } from "./lib/url";
import { helpWanted, judgmentProviderName, scorecardDimension } from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function latestScorecard(ctx: QueryCtx, siteId: Id<"sites">) {
  return await ctx.db
    .query("scorecards")
    .withIndex("by_site_created", (q) => q.eq("siteId", siteId))
    .order("desc")
    .first();
}

function publicAuthor(user: Doc<"users"> | null) {
  if (!user) return null;
  return {
    _id: user._id,
    displayName: user.displayName,
    imageUrl: user.imageUrl,
    roles: user.roles,
    siteId: user.siteId,
  };
}

async function siteSummary(ctx: QueryCtx, site: Doc<"sites">) {
  const [owner, scorecard] = await Promise.all([
    ctx.db.get(site.ownerId),
    latestScorecard(ctx, site._id),
  ]);
  return {
    _id: site._id,
    url: site.url,
    title: site.title,
    helpWanted: site.helpWanted,
    context: site.context,
    audience: site.audience,
    status: site.status,
    submittedAt: site.submittedAt,
    graduatedAt: site.graduatedAt,
    trendingScore: site.trendingScore,
    clickCount: site.clickCount,
    critiqueCount: site.critiqueCount,
    owner: publicAuthor(owner),
    overall: scorecard?.overall ?? null,
  };
}

/**
 * Critiques this user has given on other people's sites that count toward
 * reciprocity. Only published ones: pending critiques haven't passed
 * moderation yet, and flagged or held ones didn't pass cleanly.
 */
async function countGivenCritiques(ctx: QueryCtx, user: Doc<"users">): Promise<number> {
  const given = await ctx.db
    .query("critiques")
    .withIndex("by_author", (q) => q.eq("authorId", user._id))
    .take(200);
  return given.filter((c) => c.moderationStatus === "published" && c.siteId !== user.siteId).length;
}

/** User-facing scorecard failure messages. The raw error only goes to the server logs. */
export const SCORECARD_ERRORS = {
  unreachable: "We couldn't reach this site to score it.",
  failed: "Something went wrong while scoring this site.",
} as const;

/** Never expose a stored error verbatim (older rows hold raw fetch/exception text). */
function publicScorecardError(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  return Object.values(SCORECARD_ERRORS).find((m) => m === stored) ?? SCORECARD_ERRORS.failed;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listTrending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_status_trending", (q) => q.eq("status", "in-dev"))
      .order("desc")
      .take(Math.min(limit ?? 50, 100));
    return await Promise.all(sites.map((s) => siteSummary(ctx, s)));
  },
});

export const listGraduated = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_status_graduated", (q) => q.eq("status", "graduated"))
      .order("desc")
      .take(Math.min(limit ?? 100, 200));
    return await Promise.all(sites.map((s) => siteSummary(ctx, s)));
  },
});

export const listHallOfFame = query({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_status_graduated", (q) => q.eq("status", "hall-of-fame"))
      .order("desc")
      .take(200);
    return await Promise.all(sites.map((s) => siteSummary(ctx, s)));
  },
});

/** Site profile: site + latest scorecard + visible critiques, side by side. */
export const get = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    const viewer = await getViewer(ctx);
    const [owner, scorecard, published, flagged, deepAudit] = await Promise.all([
      ctx.db.get(site.ownerId),
      latestScorecard(ctx, siteId),
      ctx.db
        .query("critiques")
        .withIndex("by_site_status_upvotes", (q) =>
          q.eq("siteId", siteId).eq("moderationStatus", "published"),
        )
        .order("desc")
        .take(100),
      ctx.db
        .query("critiques")
        .withIndex("by_site_status_upvotes", (q) =>
          q.eq("siteId", siteId).eq("moderationStatus", "flagged"),
        )
        .order("desc")
        .take(100),
      ctx.db
        .query("deepAudits")
        .withIndex("by_site_created", (q) => q.eq("siteId", siteId))
        .order("desc")
        .first(),
    ]);

    const visible = [...published, ...flagged].toSorted(
      (a, b) => b.upvoteCount - a.upvoteCount || b.createdAt - a.createdAt,
    );

    const critiques = await Promise.all(
      visible.map(async (c) => {
        const [author, vote] = await Promise.all([
          c.authorId ? ctx.db.get(c.authorId) : null,
          viewer
            ? ctx.db
                .query("critiqueVotes")
                .withIndex("by_critique_user", (q) =>
                  q.eq("critiqueId", c._id).eq("userId", viewer._id),
                )
                .unique()
            : null,
        ]);
        return {
          _id: c._id,
          addresses: c.addresses,
          firstImpression: c.firstImpression,
          sellsThem: c.sellsThem,
          oneThingToFix: c.oneThingToFix,
          whatWorks: c.whatWorks,
          flagged: c.moderationStatus === "flagged",
          upvoteCount: c.upvoteCount,
          createdAt: c.createdAt,
          author: publicAuthor(author),
          viewerHasUpvoted: vote !== null,
          isOwnCritique: viewer !== null && c.authorId === viewer._id,
        };
      }),
    );

    return {
      site: {
        _id: site._id,
        url: site.url,
        title: site.title,
        helpWanted: site.helpWanted,
        context: site.context,
        audience: site.audience,
        status: site.status,
        verified: site.verified,
        verificationMethod: site.verificationMethod,
        submittedAt: site.submittedAt,
        graduatedAt: site.graduatedAt,
        clickCount: site.clickCount,
        critiqueCount: site.critiqueCount,
        scorecardStatus: site.scorecardStatus,
        scorecardError: publicScorecardError(site.scorecardError),
      },
      owner: publicAuthor(owner),
      scorecard,
      deepAudit: deepAudit ? { status: deepAudit.status, result: deepAudit.result } : null,
      critiques,
      viewer: {
        signedIn: viewer !== null,
        isOwner: viewer !== null && viewer._id === site.ownerId,
      },
    };
  },
});

/** Whether the signed-in user may submit a site, and why not. */
export const submitEligibility = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    const required = RECIPROCITY_CRITIQUES_REQUIRED;
    if (!viewer) return { signedIn: false as const, required, given: 0, existingSiteId: null };
    const given = await countGivenCritiques(ctx, viewer);
    return {
      signedIn: true as const,
      required,
      given,
      existingSiteId: viewer.siteId ?? null,
    };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const submit = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    helpWanted: v.array(helpWanted),
    context: v.optional(v.string()),
    audience: v.optional(v.string()),
    verificationMethod: v.union(v.literal("github-profile"), v.literal("badge")),
  },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);

    if (user.siteId && (await ctx.db.get(user.siteId))) {
      throw new ConvexError("You've already posted your site. One personal site per person.");
    }

    if (RECIPROCITY_CRITIQUES_REQUIRED > 0) {
      const given = await countGivenCritiques(ctx, user);
      if (given < RECIPROCITY_CRITIQUES_REQUIRED) {
        throw new ConvexError(
          `Give ${RECIPROCITY_CRITIQUES_REQUIRED} critiques before posting your own site (you've given ${given}).`,
        );
      }
    }

    const normalized = normalizeSiteUrl(args.url);
    if (!normalized) throw new ConvexError("Enter a public http(s) URL, like https://yourname.com");

    const title = args.title.trim();
    if (title.length < 1 || title.length > 80) {
      throw new ConvexError("Title must be 1–80 characters.");
    }

    const wanted = [...new Set(args.helpWanted)];
    if (wanted.length === 0) wanted.push("overall");

    const context = args.context?.trim() || undefined;
    if (context && context.length > CONTEXT_MAX) {
      throw new ConvexError(`Context must be at most ${CONTEXT_MAX} characters.`);
    }
    const audience = args.audience?.trim() || undefined;
    if (audience && audience.length > AUDIENCE_MAX) {
      throw new ConvexError(`Audience must be at most ${AUDIENCE_MAX} characters.`);
    }

    const duplicate = await ctx.db
      .query("sites")
      .withIndex("by_normalized_url", (q) => q.eq("normalizedUrl", normalized.normalized))
      .first();
    if (duplicate) throw new ConvexError("That site has already been posted.");

    const now = Date.now();
    const siteId = await ctx.db.insert("sites", {
      url: normalized.url,
      normalizedUrl: normalized.normalized,
      title,
      ownerId: user._id,
      helpWanted: wanted,
      context,
      audience,
      status: "in-dev",
      verificationMethod: args.verificationMethod,
      verified: false,
      submittedAt: now,
      clickCount: 0,
      clickHeat: 0,
      clickHeatAt: now,
      trendingScore: 0,
      critiqueCount: 0,
      scorecardStatus: "pending",
    });
    await ctx.db.patch(user._id, { siteId });

    // Tier 1: instant scorecard.
    await ctx.scheduler.runAfter(0, internal.judge.scoreSite, { siteId });
    return siteId;
  },
});

/** Owner marks their site live/complete: it moves to the archive with its critique history. */
export const graduate = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const user = await requireViewer(ctx);
    const site = await ctx.db.get(siteId);
    if (!site) throw new ConvexError("Site not found.");
    if (site.ownerId !== user._id) throw new ConvexError("Only the site's owner can graduate it.");
    if (site.status !== "in-dev") throw new ConvexError("This site has already graduated.");
    await ctx.db.patch(siteId, { status: "graduated", graduatedAt: Date.now() });
  },
});

/**
 * Record an outbound click. Anonymous by design.
 * TODO: de-duplicate per visitor / rate limit to resist click inflation.
 */
export const recordClick = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return;
    const now = Date.now();
    await ctx.db.patch(siteId, {
      clickCount: site.clickCount + 1,
      clickHeat: bumpClickHeat(site.clickHeat, site.clickHeatAt, now),
      clickHeatAt: now,
    });
  },
});

/**
 * Maintainer-only (run from the dashboard or `npx convex run`): induct a
 * graduated site into the hall of fame after domain verification.
 */
export const inductToHallOfFame = internalMutation({
  args: {
    siteId: v.id("sites"),
    verificationMethod: v.union(v.literal("domain-token"), v.literal("dns-txt")),
  },
  handler: async (ctx, { siteId, verificationMethod }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new ConvexError("Site not found.");
    if (site.status !== "graduated") throw new ConvexError("Only graduated sites can be inducted.");
    await ctx.db.patch(siteId, { status: "hall-of-fame", verificationMethod, verified: true });
  },
});

// ---------------------------------------------------------------------------
// Internal: used by the scorecard action (convex/judge.ts)
// ---------------------------------------------------------------------------

export const getForScoring = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    return site
      ? {
          url: site.url,
          title: site.title,
          helpWanted: site.helpWanted,
          context: site.context,
          audience: site.audience,
        }
      : null;
  },
});

export const saveScorecard = internalMutation({
  args: {
    siteId: v.id("sites"),
    provider: judgmentProviderName,
    dimensions: v.array(
      v.object({
        dimension: scorecardDimension,
        level: v.string(),
        score: v.number(),
        maxScore: v.number(),
        confidence: v.number(),
        weight: v.number(),
      }),
    ),
    overall: v.number(),
    focus: v.array(scorecardDimension),
  },
  handler: async (ctx, { siteId, ...scorecard }) => {
    if (!(await ctx.db.get(siteId))) return;
    await ctx.db.insert("scorecards", { siteId, ...scorecard, createdAt: Date.now() });
    await ctx.db.patch(siteId, { scorecardStatus: "ready", scorecardError: undefined });
  },
});

export const markScorecardFailed = internalMutation({
  args: { siteId: v.id("sites"), reason: v.union(v.literal("unreachable"), v.literal("failed")) },
  handler: async (ctx, { siteId, reason }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return;
    // Keep showing the previous scorecard if there is one.
    const hasPrevious = (await latestScorecard(ctx, siteId)) !== null;
    await ctx.db.patch(siteId, {
      scorecardStatus: hasPrevious ? "ready" : "failed",
      scorecardError: SCORECARD_ERRORS[reason],
    });
  },
});
