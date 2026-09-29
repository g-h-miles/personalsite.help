import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getViewer, requireViewer } from "./lib/auth";
import {
  ANON_CRITIQUES_PER_SITE_PER_HOUR,
  CRITIQUE_FIELD_MAX,
  CRITIQUE_FIELD_MIN,
} from "./lib/config";
import { helpWanted, judgmentProviderName } from "./schema";

const HOUR = 60 * 60 * 1000;

function cleanField(label: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < CRITIQUE_FIELD_MIN) {
    throw new ConvexError(`"${label}" needs a little more detail.`);
  }
  if (trimmed.length > CRITIQUE_FIELD_MAX) {
    throw new ConvexError(`"${label}" must be at most ${CRITIQUE_FIELD_MAX} characters.`);
  }
  return trimmed;
}

/**
 * Submit a structured critique. Anonymous allowed. Every critique goes through
 * the moderation judgment before it is visible.
 */
export const submit = mutation({
  args: {
    siteId: v.id("sites"),
    addresses: v.optional(helpWanted),
    firstImpression: v.string(),
    sellsThem: v.string(),
    oneThingToFix: v.string(),
    whatWorks: v.string(),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new ConvexError("Site not found.");

    // Signed-in users get a user doc (critiques build reputation); anonymous don't.
    const identity = await ctx.auth.getUserIdentity();
    const author = identity ? await requireViewer(ctx) : null;

    if (author && site.ownerId === author._id) {
      throw new ConvexError("You can't critique your own site.");
    }

    if (args.addresses && !site.helpWanted.includes(args.addresses)) {
      throw new ConvexError("That isn't one of the things this person asked for help with.");
    }

    const now = Date.now();

    // Rate limit underneath the AI moderation layer.
    if (!author) {
      const recent = await ctx.db
        .query("critiques")
        .withIndex("by_site_created", (q) => q.eq("siteId", site._id).gte("createdAt", now - HOUR))
        .collect();
      const anonymous = recent.filter((c) => c.authorId === undefined).length;
      if (anonymous >= ANON_CRITIQUES_PER_SITE_PER_HOUR) {
        throw new ConvexError(
          "Too many anonymous critiques on this site right now. Sign in, or try later.",
        );
      }
    }

    const critiqueId = await ctx.db.insert("critiques", {
      siteId: site._id,
      authorId: author?._id,
      addresses: args.addresses,
      firstImpression: cleanField("First impression", args.firstImpression),
      sellsThem: cleanField("Does it sell them?", args.sellsThem),
      oneThingToFix: cleanField("One thing to fix", args.oneThingToFix),
      whatWorks: cleanField("What works", args.whatWorks),
      moderationStatus: "pending",
      upvoteCount: 0,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.judge.moderateCritique, { critiqueId });
    return critiqueId;
  },
});

/** Toggle the viewer's upvote on a critique. Returns the new state. */
export const toggleUpvote = mutation({
  args: { critiqueId: v.id("critiques") },
  handler: async (ctx, { critiqueId }) => {
    const user = await requireViewer(ctx);
    const critique = await ctx.db.get(critiqueId);
    if (
      !critique ||
      critique.moderationStatus === "held" ||
      critique.moderationStatus === "pending"
    ) {
      throw new ConvexError("Critique not found.");
    }
    if (critique.authorId === user._id)
      throw new ConvexError("You can't upvote your own critique.");

    const existing = await ctx.db
      .query("critiqueVotes")
      .withIndex("by_critique_user", (q) => q.eq("critiqueId", critiqueId).eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(critiqueId, { upvoteCount: Math.max(0, critique.upvoteCount - 1) });
      return { upvoted: false };
    }
    await ctx.db.insert("critiqueVotes", { critiqueId, userId: user._id });
    await ctx.db.patch(critiqueId, { upvoteCount: critique.upvoteCount + 1 });
    return { upvoted: true };
  },
});

/** Critiques the viewer wrote that are still waiting on moderation, for this site. */
export const myPending = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return 0;
    const mine = await ctx.db
      .query("critiques")
      .withIndex("by_author", (q) => q.eq("authorId", viewer._id))
      .take(200);
    return mine.filter((c) => c.siteId === siteId && c.moderationStatus === "pending").length;
  },
});

// ---------------------------------------------------------------------------
// Internal: used by the moderation action (convex/judge.ts)
// ---------------------------------------------------------------------------

export const getForModeration = internalQuery({
  args: { critiqueId: v.id("critiques") },
  handler: async (ctx, { critiqueId }) => {
    const critique = await ctx.db.get(critiqueId);
    if (!critique) return null;
    const site = await ctx.db.get(critique.siteId);
    if (!site) return null;
    return {
      signedIn: critique.authorId !== undefined,
      siteTitle: site.title,
      siteUrl: site.url,
      firstImpression: critique.firstImpression,
      sellsThem: critique.sellsThem,
      oneThingToFix: critique.oneThingToFix,
      whatWorks: critique.whatWorks,
    };
  },
});

export const applyModeration = internalMutation({
  args: {
    critiqueId: v.id("critiques"),
    decision: v.union(v.literal("published"), v.literal("flagged"), v.literal("held")),
    moderation: v.optional(
      v.object({
        provider: judgmentProviderName,
        abusive: v.number(),
        substantive: v.number(),
        onTopic: v.number(),
      }),
    ),
  },
  handler: async (ctx, { critiqueId, decision, moderation }) => {
    const critique = await ctx.db.get(critiqueId);
    if (!critique) return;
    const wasVisible =
      critique.moderationStatus === "published" || critique.moderationStatus === "flagged";
    const isVisible = decision === "published" || decision === "flagged";
    await ctx.db.patch(critiqueId, { moderationStatus: decision, moderation });
    if (wasVisible !== isVisible) {
      const site = await ctx.db.get(critique.siteId);
      if (site) {
        await ctx.db.patch(site._id, {
          critiqueCount: Math.max(0, site.critiqueCount + (isVisible ? 1 : -1)),
        });
      }
    }
  },
});
