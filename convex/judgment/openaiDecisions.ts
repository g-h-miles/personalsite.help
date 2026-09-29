/**
 * OpenAI Decisions API adapter — STUB.
 *
 * TODO(judgment-provider): implement against the OpenAI Decisions API (limited
 * preview, announced DevDay 2026) once access is granted and the provider
 * decision is made. Do not guess the HTTP contract; use the official API
 * reference in the OpenAI platform docs (https://platform.openai.com/docs) for
 * the preview. Map its decisions onto our three primitives (choice / yesNo /
 * score) and wrap transport or parse failures in `ProviderRequestFailed`.
 *
 * Until then every call fails with `ProviderNotConfigured`.
 */
import { Effect } from "effect";
import { type JudgmentProviderService, ProviderNotConfigured } from "./provider";

export const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";

export function makeOpenAIDecisionsProvider(
  env: Record<string, string | undefined>,
): JudgmentProviderService {
  const apiKey = env[OPENAI_API_KEY_ENV];
  const notConfigured = new ProviderNotConfigured({
    provider: "openai-decisions",
    reason: apiKey
      ? "OpenAI Decisions adapter is not implemented yet (see TODO in convex/judgment/openaiDecisions.ts)"
      : `Missing ${OPENAI_API_KEY_ENV}. Run: npx convex env set ${OPENAI_API_KEY_ENV} <key>`,
  });
  return {
    name: "openai-decisions",
    choice: () => Effect.fail(notConfigured),
    yesNo: () => Effect.fail(notConfigured),
    score: () => Effect.fail(notConfigured),
  };
}
