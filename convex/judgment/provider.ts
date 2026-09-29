/**
 * Provider-agnostic "System One" judgment interface.
 *
 * The instant scorecard and comment moderation are built on three bounded
 * primitives — never free-form text — so the model provider (TypeSafe's Jev,
 * OpenAI's Decisions API, or the deterministic mock) can be swapped without
 * touching callers:
 *
 * - `choice`  — pick one of a fixed set, returning the full distribution.
 * - `yesNo`   — the probability that the answer is "yes".
 * - `score`   — place something on an ordered scale of levels, with confidence.
 *
 * Callers depend on the `JudgmentProvider` Effect service tag and get a
 * concrete implementation through a Layer (see ./select.ts).
 */
import { Context, Data, type Effect } from "effect";

export type ProviderName = "mock" | "jev" | "openai-decisions";

export const PROVIDER_NAMES: readonly ProviderName[] = ["mock", "jev", "openai-decisions"];

interface JudgmentRequestBase {
  /**
   * Stable machine key for this judgment, e.g. "moderation.abusive" or
   * "scorecard.typography". Used for logging, caching and by the mock provider.
   */
  readonly key: string;
  /** The natural-language question the model answers. */
  readonly question: string;
  /** Application state / extracted evidence the question is asked about. */
  readonly context: string;
}

export interface ChoiceRequest<A extends string> extends JudgmentRequestBase {
  readonly options: readonly [A, ...A[]];
}

export interface ChoiceResult<A extends string> {
  readonly choice: A;
  /** Probability per option; sums to ~1. */
  readonly distribution: Readonly<Record<A, number>>;
}

export type YesNoRequest = JudgmentRequestBase;

export interface YesNoResult {
  /** P(yes), 0..1. */
  readonly probability: number;
}

export interface ScoreRequest<L extends string> extends JudgmentRequestBase {
  /** Ordered from worst to best. */
  readonly levels: readonly [L, ...L[]];
}

export interface ScoreResult<L extends string> {
  readonly level: L;
  /** 0-based index of `level` in the request's `levels`. */
  readonly index: number;
  /** 0..1 — how sure the provider is about `level`. */
  readonly confidence: number;
}

/** The provider has no credentials, or its adapter is not implemented yet. */
export class ProviderNotConfigured extends Data.TaggedError("ProviderNotConfigured")<{
  readonly provider: ProviderName;
  readonly reason: string;
}> {}

/** The provider was reachable but the request failed or returned garbage. */
export class ProviderRequestFailed extends Data.TaggedError("ProviderRequestFailed")<{
  readonly provider: ProviderName;
  readonly key: string;
  readonly cause: unknown;
}> {}

/** `JUDGMENT_PROVIDER` names a provider we don't know. */
export class UnknownProvider extends Data.TaggedError("UnknownProvider")<{
  readonly value: string;
}> {}

export type JudgmentError = ProviderNotConfigured | ProviderRequestFailed;

export interface JudgmentProviderService {
  readonly name: ProviderName;
  readonly choice: <A extends string>(
    request: ChoiceRequest<A>,
  ) => Effect.Effect<ChoiceResult<A>, JudgmentError>;
  readonly yesNo: (request: YesNoRequest) => Effect.Effect<YesNoResult, JudgmentError>;
  readonly score: <L extends string>(
    request: ScoreRequest<L>,
  ) => Effect.Effect<ScoreResult<L>, JudgmentError>;
}

export class JudgmentProvider extends Context.Tag("personalsite/JudgmentProvider")<
  JudgmentProvider,
  JudgmentProviderService
>() {}
