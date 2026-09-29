import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { makeMockProvider, type MockRules } from "../convex/judgment/mock";
import {
  type CritiqueText,
  decideModeration,
  MODERATION_THRESHOLDS as T,
  moderateCritique,
} from "../convex/judgment/moderation";
import { JudgmentProvider } from "../convex/judgment/provider";
import { judgmentProviderLayer } from "../convex/judgment/select";

const clean = { abusive: 0.02, substantive: 0.9, onTopic: 0.95 };

describe("decideModeration thresholds", () => {
  it("publishes confidently good critiques", () => {
    expect(decideModeration(clean)).toBe("published");
  });

  it("holds high-confidence abuse", () => {
    expect(decideModeration({ ...clean, abusive: T.holdAbusive })).toBe("held");
  });

  it("holds high-confidence empty critiques", () => {
    expect(decideModeration({ ...clean, substantive: T.holdNotSubstantive })).toBe("held");
  });

  it("holds high-confidence off-topic critiques", () => {
    expect(decideModeration({ ...clean, onTopic: T.holdOffTopic })).toBe("held");
  });

  it("flags the uncertain middle (live but reviewable)", () => {
    expect(decideModeration({ ...clean, abusive: 0.5 })).toBe("flagged");
    expect(decideModeration({ ...clean, substantive: 0.4 })).toBe("flagged");
    expect(decideModeration({ ...clean, onTopic: 0.4 })).toBe("flagged");
  });

  it("treats the publish boundaries as inclusive", () => {
    expect(
      decideModeration({
        abusive: T.publishMaxAbusive,
        substantive: T.publishMinSubstantive,
        onTopic: T.publishMinOnTopic,
      }),
    ).toBe("published");
  });

  it("lets hold win over publish when signals conflict", () => {
    expect(decideModeration({ abusive: 0.9, substantive: 0.99, onTopic: 0.99 })).toBe("held");
  });
});

const critique = (overrides: Partial<CritiqueText> = {}): CritiqueText => ({
  siteTitle: "Jane Doe",
  siteUrl: "https://jane.dev",
  firstImpression: "Big confident headline, but I had to scroll to learn what Jane actually does.",
  sellsThem: "I think she is a brand designer, but only because of the case study titles.",
  oneThingToFix: "Put one sentence under the name: role, speciality, and who you work with.",
  whatWorks: "The case studies are specific and show process, not just final shots.",
  ...overrides,
});

const withMock = (rules?: MockRules) => Layer.succeed(JudgmentProvider, makeMockProvider(rules));

const moderateWithDefaultMock = () =>
  Effect.runPromise(moderateCritique(critique()).pipe(Effect.provide(withMock())));

describe("moderateCritique with the mock provider", () => {
  it("publishes a substantive critique", async () => {
    const result = await Effect.runPromise(
      moderateCritique(critique()).pipe(Effect.provide(withMock())),
    );
    expect(result.decision).toBe("published");
    expect(result.provider).toBe("mock");
  });

  it("holds empty praise", async () => {
    const result = await Effect.runPromise(
      moderateCritique(
        critique({
          firstImpression: "looks clean 🔥",
          sellsThem: "yes",
          oneThingToFix: "nah",
          whatWorks: "all",
        }),
      ).pipe(Effect.provide(withMock())),
    );
    expect(result.decision).toBe("held");
  });

  it("holds abuse", async () => {
    const result = await Effect.runPromise(
      moderateCritique(
        critique({ oneThingToFix: "Delete it, this is garbage and you are an idiot." }),
      ).pipe(Effect.provide(withMock())),
    );
    expect(result.decision).toBe("held");
  });

  it("maps provider probabilities through the thresholds", async () => {
    const result = await Effect.runPromise(
      moderateCritique(critique()).pipe(
        Effect.provide(withMock({ yesNo: { "moderation.abusive": () => 0.5 } })),
      ),
    );
    expect(result.abusive).toBe(0.5);
    expect(result.decision).toBe("flagged");
  });

  it("is deterministic", async () => {
    expect(await moderateWithDefaultMock()).toEqual(await moderateWithDefaultMock());
  });
});

describe("provider selection", () => {
  it("defaults to the mock provider", async () => {
    const result = await Effect.runPromise(
      moderateCritique(critique()).pipe(Effect.provide(judgmentProviderLayer({}))),
    );
    expect(result.provider).toBe("mock");
  });

  it.each(["jev", "openai-decisions"])(
    "stub %s fails with a typed ProviderNotConfigured error",
    async (name) => {
      const result = await Effect.runPromise(
        moderateCritique(critique()).pipe(
          Effect.provide(judgmentProviderLayer({ JUDGMENT_PROVIDER: name })),
          Effect.either,
        ),
      );
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe("ProviderNotConfigured");
      }
    },
  );

  it("rejects an unknown provider name", async () => {
    const result = await Effect.runPromise(
      moderateCritique(critique()).pipe(
        Effect.provide(judgmentProviderLayer({ JUDGMENT_PROVIDER: "gpt-magic" })),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result) && result.left._tag).toBe("UnknownProvider");
  });
});
