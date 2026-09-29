/**
 * Demo data for local development and design work. Internal only:
 *   npx convex run seed:demo
 * Does nothing if any site already exists.
 */
import { internalMutation } from "./_generated/server";
import { composeScorecard, DIMENSIONS, type HelpWanted, SCORE_LEVELS } from "./judgment/scorecard";
import type { Role } from "./judgment/taxonomy";

const DAY = 24 * 60 * 60 * 1000;

const PEOPLE: {
  name: string;
  roles: Role[];
  site: {
    url: string;
    title: string;
    helpWanted: HelpWanted[];
    context?: string;
    audience?: string;
  };
  scores: number[];
  status?: "graduated" | "hall-of-fame";
}[] = [
  {
    name: "Jane Park",
    roles: ["designer"],
    site: {
      url: "https://example.com/jane",
      title: "Jane Park — brand designer",
      helpWanted: ["selling-myself", "design"],
      context: "I'm applying to brand design roles at small studios",
      audience: "Creative directors at small studios",
    },
    scores: [3, 4, 2, 2, 4, 5, 3, 3],
  },
  {
    name: "Sam Okafor",
    roles: ["engineer", "ai-developer"],
    site: {
      url: "https://example.com/sam",
      title: "Sam Okafor",
      helpWanted: ["background", "content"],
      context: "Moving from backend work into applied ML. Does my history read as a strength?",
    },
    scores: [2, 2, 3, 4, 3, 3, 2, 4],
  },
  {
    name: "Lena Voss",
    roles: ["designer", "engineer"],
    site: {
      url: "https://example.com/lena",
      title: "Lena Voss — design engineer",
      helpWanted: ["overall"],
    },
    scores: [4, 4, 5, 4, 5, 4, 4, 4],
    status: "graduated",
  },
];

export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("sites").first()) return "skipped: sites already exist";
    const now = Date.now();
    const siteIds = [];

    for (const [i, p] of PEOPLE.entries()) {
      const userId = await ctx.db.insert("users", {
        clerkId: `demo_${i}`,
        displayName: p.name,
        roles: p.roles,
      });
      const submittedAt = now - (i + 1) * 2 * DAY;
      const siteId = await ctx.db.insert("sites", {
        ...p.site,
        normalizedUrl: p.site.url.replace(/^https?:\/\//, ""),
        ownerId: userId,
        status: p.status ?? "in-dev",
        verificationMethod: "badge",
        verified: false,
        submittedAt,
        graduatedAt: p.status ? now - DAY : undefined,
        clickCount: 40 - i * 10,
        clickHeat: 12 - i * 3,
        clickHeatAt: now,
        trendingScore: 20 - i * 5,
        critiqueCount: 0,
        scorecardStatus: "ready",
      });
      await ctx.db.patch(userId, { siteId });
      siteIds.push({ siteId, userId });

      const card = composeScorecard(
        "mock",
        DIMENSIONS.map((dimension, d) => {
          const score = p.scores[d] ?? 3;
          return {
            dimension,
            score,
            level: SCORE_LEVELS[score - 1]!,
            maxScore: SCORE_LEVELS.length,
            confidence: 0.6,
          };
        }),
        p.site.helpWanted,
      );
      await ctx.db.insert("scorecards", { siteId, ...card, createdAt: submittedAt });
    }

    const [jane, sam, lena] = siteIds;
    if (!jane || !sam || !lena) return "seeded";
    const critiques = [
      {
        site: jane.siteId,
        author: sam.userId,
        addresses: "selling-myself" as const,
        firstImpression:
          "The logo work up top is gorgeous, but I read three case studies before I knew you freelance.",
        sellsThem:
          "Brand designer, probably mid-level. I'd hire you for a rebrand, not sure about packaging.",
        oneThingToFix:
          'Say who you work with in the first line: "Brand identities for independent food and drink brands."',
        whatWorks: "Every case study shows the messy middle, not just the final mockups.",
        upvotes: 3,
      },
      {
        site: jane.siteId,
        author: undefined,
        addresses: "design" as const,
        firstImpression: "Beautiful type, very quiet. Feels like a studio site more than a person.",
        sellsThem: "A designer with taste. I'm not sure what kind of role you want though.",
        oneThingToFix: "Add a photo or one personal line so it feels like you.",
        whatWorks: "The grid and the restraint in color.",
        upvotes: 1,
      },
      {
        site: sam.siteId,
        author: lena.userId,
        addresses: "background" as const,
        firstImpression: "Dense, but the timeline makes the backend-to-ML move look deliberate.",
        sellsThem: "An engineer who ships. The ML part reads as a side project so far.",
        oneThingToFix:
          "Lead with the ML project that has real users, and put the backend years under it.",
        whatWorks: "Numbers everywhere: latency, users, cost. Very credible.",
        upvotes: 2,
      },
    ];
    for (const [i, c] of critiques.entries()) {
      await ctx.db.insert("critiques", {
        siteId: c.site,
        authorId: c.author,
        addresses: c.addresses,
        firstImpression: c.firstImpression,
        sellsThem: c.sellsThem,
        oneThingToFix: c.oneThingToFix,
        whatWorks: c.whatWorks,
        moderationStatus: "published",
        moderation: { provider: "mock", abusive: 0.03, substantive: 0.9, onTopic: 0.92 },
        upvoteCount: c.upvotes,
        createdAt: now - (i + 1) * 3 * 60 * 60 * 1000,
      });
      const site = await ctx.db.get(c.site);
      if (site) await ctx.db.patch(c.site, { critiqueCount: site.critiqueCount + 1 });
    }
    return "seeded";
  },
});
