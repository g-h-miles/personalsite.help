/**
 * Picks the judgment provider from the `JUDGMENT_PROVIDER` env var
 * (`mock` | `jev` | `openai-decisions`, default `mock`).
 */
import { Effect, Layer } from "effect";
import { makeJevProvider } from "./jev";
import { makeMockProvider } from "./mock";
import { makeOpenAIDecisionsProvider } from "./openaiDecisions";
import {
  JudgmentProvider,
  type JudgmentProviderService,
  PROVIDER_NAMES,
  type ProviderName,
  UnknownProvider,
} from "./provider";

export const JUDGMENT_PROVIDER_ENV = "JUDGMENT_PROVIDER";

export function parseProviderName(
  value: string | undefined,
): Effect.Effect<ProviderName, UnknownProvider> {
  const normalized = (value ?? "mock").trim().toLowerCase() || "mock";
  return (PROVIDER_NAMES as readonly string[]).includes(normalized)
    ? Effect.succeed(normalized as ProviderName)
    : Effect.fail(new UnknownProvider({ value: normalized }));
}

export function makeProvider(
  name: ProviderName,
  env: Record<string, string | undefined>,
): JudgmentProviderService {
  switch (name) {
    case "mock":
      return makeMockProvider();
    case "jev":
      return makeJevProvider(env);
    case "openai-decisions":
      return makeOpenAIDecisionsProvider(env);
  }
}

/** Layer providing `JudgmentProvider` chosen from env. */
export function judgmentProviderLayer(
  env: Record<string, string | undefined>,
): Layer.Layer<JudgmentProvider, UnknownProvider> {
  return Layer.effect(
    JudgmentProvider,
    Effect.map(parseProviderName(env[JUDGMENT_PROVIDER_ENV]), (name) => makeProvider(name, env)),
  );
}
