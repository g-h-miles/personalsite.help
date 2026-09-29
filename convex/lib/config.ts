/**
 * Product knobs that are still being validated (see "Open questions" in SPEC.md).
 */

/**
 * Reciprocity gate: how many visible critiques a user must have given on other
 * people's sites before they can post their own. Set to 0 to disable.
 */
export const RECIPROCITY_CRITIQUES_REQUIRED = 2;

/** Max roles ("lenses") a user can pick. */
export const MAX_ROLES = 2;

/** Rate limit for anonymous critiques, per site. */
export const ANON_CRITIQUES_PER_SITE_PER_HOUR = 5;

/** Per-field critique length limits. */
export const CRITIQUE_FIELD_MIN = 3;
export const CRITIQUE_FIELD_MAX = 2000;

/** Sites whose latest scorecard is older than this get re-audited by cron. */
export const REAUDIT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Optional free-text context on a site submission ("what I'm going for"). */
export const CONTEXT_MAX = 280;

/** Optional "who is this site meant to convince" on a site submission. */
export const AUDIENCE_MAX = 120;
