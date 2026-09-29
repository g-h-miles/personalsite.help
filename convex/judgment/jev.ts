/**
 * TypeSafe AI "Jev" adapter — STUB.
 *
 * TODO(judgment-provider): implement against the real Jev API once the
 * provider decision is made. Do not guess the HTTP contract; read the docs:
 *   https://docs.typesafe.ai/llms.txt
 * Map Jev's typed judgments onto our three primitives (choice / yesNo / score)
 * and wrap transport or parse failures in `ProviderRequestFailed`.
 *
 * Until then every call fails with `ProviderNotConfigured`, so selecting
 * `JUDGMENT_PROVIDER=jev` degrades loudly instead of silently returning junk.
 */
import { Effect } from "effect";
import { type JudgmentProviderService, ProviderNotConfigured } from "./provider";

export const JEV_API_KEY_ENV = "JEV_API_KEY";

export function makeJevProvider(env: Record<string, string | undefined>): JudgmentProviderService {
  const apiKey = env[JEV_API_KEY_ENV];
  const notConfigured = new ProviderNotConfigured({
    provider: "jev",
    reason: apiKey
      ? "Jev adapter is not implemented yet (see TODO in convex/judgment/jev.ts)"
      : `Missing ${JEV_API_KEY_ENV}. Run: npx convex env set ${JEV_API_KEY_ENV} <key>`,
  });
  return {
    name: "jev",
    choice: () => Effect.fail(notConfigured),
    yesNo: () => Effect.fail(notConfigured),
    score: () => Effect.fail(notConfigured),
  };
}
