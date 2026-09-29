import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Self-selected "lenses" shown next to a critic's name. Pick up to two. */
export const role = v.union(
  v.literal("designer"),
  v.literal("engineer"),
  v.literal("ai-developer"),
);

export const siteStatus = v.union(
  v.literal("in-dev"),
  v.literal("graduated"),
  v.literal("hall-of-fame"),
);

/**
 * How a site owner proved the site is theirs. Trust-first at the entrance
 * (GitHub profile match or "in review" badge); full domain verification is
 * reserved for the hall of fame.
 */
export const verificationMethod = v.union(
  v.literal("github-profile"),
  v.literal("badge"),
  v.literal("domain-token"),
  v.literal("dns-txt"),
);

/**
 * What the owner wants feedback on. "Show the best you": does the site sell
 * the person, communicate their background, and work as content / experience /
 * design? `overall` is the default.
 */
export const helpWanted = v.union(
  v.literal("selling-myself"),
  v.literal("background"),
  v.literal("content"),
  v.literal("experience"),
  v.literal("design"),
  v.literal("overall"),
);

/**
 * Scorecard dimensions, in two groups (see convex/judgment/scorecard.ts):
 * "Does it sell you" — clarity, background, memorability, callToAction;
 * "Craft" — visualHierarchy, typography, copyQuality, accessibility.
 */
export const scorecardDimension = v.union(
  v.literal("clarity"),
  v.literal("background"),
  v.literal("memorability"),
  v.literal("callToAction"),
  v.literal("visualHierarchy"),
  v.literal("typography"),
  v.literal("copyQuality"),
  v.literal("accessibility"),
);

/**
 * `pending` = waiting for the moderation judgment (not visible).
 * `published` = live. `flagged` = live, but the judgment was uncertain so it is
 * marked for review and can be reported. `held` = hidden (high-confidence junk).
 */
export const moderationStatus = v.union(
  v.literal("pending"),
  v.literal("published"),
  v.literal("flagged"),
  v.literal("held"),
);

export const judgmentProviderName = v.union(
  v.literal("mock"),
  v.literal("jev"),
  v.literal("openai-decisions"),
);

export default defineSchema({
  users: defineTable({
    /** Clerk user id (JWT `sub`). */
    clerkId: v.string(),
    displayName: v.string(),
    imageUrl: v.optional(v.string()),
    /** Up to two lenses; enforced in mutations. */
    roles: v.array(role),
    /** The user's own personal site in the community ("your site is your credential"). */
    siteId: v.optional(v.id("sites")),
  }).index("by_clerk_id", ["clerkId"]),

  sites: defineTable({
    url: v.string(),
    /** Lowercased origin + path without trailing slash, for de-duplication. */
    normalizedUrl: v.string(),
    title: v.string(),
    ownerId: v.id("users"),
    /** At least one; defaults to ["overall"]. */
    helpWanted: v.array(helpWanted),
    /** Optional free text, max CONTEXT_MAX (140) chars; older rows may be longer. */
    context: v.optional(v.string()),
    /** Optional: who the site is meant to convince. */
    audience: v.optional(v.string()),
    status: siteStatus,
    verificationMethod: verificationMethod,
    verified: v.boolean(),
    submittedAt: v.number(),
    graduatedAt: v.optional(v.number()),
    /** Total outbound clicks, all time. */
    clickCount: v.number(),
    /** Exponentially decayed click count, as of `clickHeatAt`. See convex/lib/trending.ts. */
    clickHeat: v.number(),
    clickHeatAt: v.number(),
    /** Recomputed by cron. */
    trendingScore: v.number(),
    /** Visible (published + flagged) critique count. */
    critiqueCount: v.number(),
    scorecardStatus: v.union(v.literal("pending"), v.literal("ready"), v.literal("failed")),
    scorecardError: v.optional(v.string()),
  })
    .index("by_status_trending", ["status", "trendingScore"])
    .index("by_status_graduated", ["status", "graduatedAt"])
    .index("by_owner", ["ownerId"])
    .index("by_normalized_url", ["normalizedUrl"]),

  /** Last counted outbound click per (site, visitor); see sites.recordClick. */
  siteClicks: defineTable({
    siteId: v.id("sites"),
    /** "user:<users id>" when signed in, else "anon:<client-generated id>". */
    visitor: v.string(),
    countedAt: v.number(),
  })
    .index("by_site_visitor", ["siteId", "visitor"])
    .index("by_counted_at", ["countedAt"]),

  scorecards: defineTable({
    siteId: v.id("sites"),
    provider: judgmentProviderName,
    dimensions: v.array(
      v.object({
        dimension: scorecardDimension,
        /** Ordered level label chosen by the provider, e.g. "good". */
        level: v.string(),
        /** 1-based position in the level scale. */
        score: v.number(),
        maxScore: v.number(),
        /** 0..1 */
        confidence: v.number(),
        /** Emphasis from the site's helpWanted (see dimensionWeights). */
        weight: v.number(),
      }),
    ),
    /** Weighted mean (weight x confidence), normalized 0..1. Dimensions are stored in display order. */
    overall: v.number(),
    /** Weakest dimensions first; tells the tier-2 deep audit where to spend words. */
    focus: v.array(scorecardDimension),
    createdAt: v.number(),
  }).index("by_site_created", ["siteId", "createdAt"]),

  critiques: defineTable({
    siteId: v.id("sites"),
    /** Absent for anonymous critiques. */
    authorId: v.optional(v.id("users")),
    /** Which of the site's helpWanted focuses this critique speaks to. */
    addresses: v.optional(helpWanted),
    firstImpression: v.string(),
    /** "Does it sell them? What do you think they do?" */
    sellsThem: v.string(),
    oneThingToFix: v.string(),
    whatWorks: v.string(),
    moderationStatus: moderationStatus,
    moderation: v.optional(
      v.object({
        provider: judgmentProviderName,
        abusive: v.number(),
        substantive: v.number(),
        onTopic: v.number(),
      }),
    ),
    upvoteCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_site_status_upvotes", ["siteId", "moderationStatus", "upvoteCount"])
    .index("by_site_created", ["siteId", "createdAt"])
    .index("by_author", ["authorId"]),

  critiqueVotes: defineTable({
    critiqueId: v.id("critiques"),
    userId: v.id("users"),
  }).index("by_critique_user", ["critiqueId", "userId"]),

  deepAudits: defineTable({
    siteId: v.id("sites"),
    requestedBy: v.id("users"),
    /** The scorecard the audit was chained from. */
    scorecardId: v.optional(v.id("scorecards")),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    /** Prose critique (markdown). */
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_site_created", ["siteId", "createdAt"]),
});
