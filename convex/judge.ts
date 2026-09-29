/**
 * Convex actions that run "System One" judgments. Scheduled from mutations
 * (site submitted → scorecard, critique submitted → moderation) and crons.
 */
import { v } from "convex/values";
import { Data, Effect, Either } from "effect";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { moderateCritique as runModeration } from "./judgment/moderation";
import { buildScorecard } from "./judgment/scorecard";
import { judgmentProviderLayer } from "./judgment/select";
import { deploymentEnv } from "./lib/env";
import { extractSiteMetrics } from "./judgment/siteMetrics";
import { fetchPageHtml } from "./lib/fetchPage";

class SiteFetchFailed extends Data.TaggedError("SiteFetchFailed")<{ readonly reason: string }> {}

const FETCH_TIMEOUT_MS = 10_000;

const fetchHtml = (url: string) =>
  Effect.tryPromise({
    try: async (signal) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      signal.addEventListener("abort", () => controller.abort());
      try {
        return await fetchPageHtml(url, controller.signal);
      } finally {
        clearTimeout(timer);
      }
    },
    catch: (cause) =>
      new SiteFetchFailed({ reason: cause instanceof Error ? cause.message : String(cause) }),
  });

/** For server logs only; users see a generic message (see sites.SCORECARD_ERRORS). */
function describeError(error: unknown): string {
  if (error && typeof error === "object" && "_tag" in error) {
    const tagged = error as { _tag: string; reason?: string; value?: string };
    return `${tagged._tag}: ${tagged.reason ?? tagged.value ?? "judgment failed"}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Tier 1: instant scorecard for a site. */
export const scoreSite = internalAction({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.runQuery(internal.sites.getForScoring, { siteId });
    if (!site) return;

    const program = Effect.gen(function* () {
      const html = yield* fetchHtml(site.url);
      return yield* buildScorecard({
        url: site.url,
        title: site.title,
        helpWanted: site.helpWanted,
        context: site.context,
        audience: site.audience,
        metrics: extractSiteMetrics(html),
      });
    }).pipe(Effect.provide(judgmentProviderLayer(deploymentEnv())), Effect.either);

    const result = await Effect.runPromise(program);
    if (Either.isRight(result)) {
      const { provider, dimensions, overall, focus } = result.right;
      await ctx.runMutation(internal.sites.saveScorecard, {
        siteId,
        provider,
        dimensions,
        overall,
        focus,
      });
    } else {
      // The raw error stays in the logs; users only see a generic message.
      console.error("scoreSite failed", siteId, describeError(result.left), result.left);
      await ctx.runMutation(internal.sites.markScorecardFailed, {
        siteId,
        reason: result.left._tag === "SiteFetchFailed" ? "unreachable" : "failed",
      });
    }
  },
});

/** Moderation judgment for a new critique. */
export const moderateCritique = internalAction({
  args: { critiqueId: v.id("critiques") },
  handler: async (ctx, { critiqueId }) => {
    const critique = await ctx.runQuery(internal.critiques.getForModeration, { critiqueId });
    if (!critique) return;

    const result = await Effect.runPromise(
      runModeration(critique).pipe(
        Effect.provide(judgmentProviderLayer(deploymentEnv())),
        Effect.either,
      ),
    );

    if (Either.isRight(result)) {
      const { decision, provider, abusive, substantive, onTopic } = result.right;
      await ctx.runMutation(internal.critiques.applyModeration, {
        critiqueId,
        decision,
        moderation: { provider, abusive, substantive, onTopic },
      });
    } else {
      // Fail safe: signed-in critiques go live but reviewable; anonymous ones wait.
      console.error("moderateCritique failed", critiqueId, result.left);
      await ctx.runMutation(internal.critiques.applyModeration, {
        critiqueId,
        decision: critique.signedIn ? "flagged" : "held",
      });
    }
  },
});
