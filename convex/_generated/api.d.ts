/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as critiques from "../critiques.js";
import type * as crons from "../crons.js";
import type * as judge from "../judge.js";
import type * as judgment_jev from "../judgment/jev.js";
import type * as judgment_mock from "../judgment/mock.js";
import type * as judgment_moderation from "../judgment/moderation.js";
import type * as judgment_openaiDecisions from "../judgment/openaiDecisions.js";
import type * as judgment_provider from "../judgment/provider.js";
import type * as judgment_scorecard from "../judgment/scorecard.js";
import type * as judgment_select from "../judgment/select.js";
import type * as judgment_siteMetrics from "../judgment/siteMetrics.js";
import type * as judgment_taxonomy from "../judgment/taxonomy.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_trending from "../lib/trending.js";
import type * as lib_url from "../lib/url.js";
import type * as seed from "../seed.js";
import type * as sites from "../sites.js";
import type * as trending from "../trending.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  critiques: typeof critiques;
  crons: typeof crons;
  judge: typeof judge;
  "judgment/jev": typeof judgment_jev;
  "judgment/mock": typeof judgment_mock;
  "judgment/moderation": typeof judgment_moderation;
  "judgment/openaiDecisions": typeof judgment_openaiDecisions;
  "judgment/provider": typeof judgment_provider;
  "judgment/scorecard": typeof judgment_scorecard;
  "judgment/select": typeof judgment_select;
  "judgment/siteMetrics": typeof judgment_siteMetrics;
  "judgment/taxonomy": typeof judgment_taxonomy;
  "lib/auth": typeof lib_auth;
  "lib/config": typeof lib_config;
  "lib/env": typeof lib_env;
  "lib/trending": typeof lib_trending;
  "lib/url": typeof lib_url;
  seed: typeof seed;
  sites: typeof sites;
  trending: typeof trending;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
