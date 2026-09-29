/// <reference types="node" />

/**
 * Convex deployment environment variables (set with `npx convex env set`).
 * The one place function code reads `process.env`, so the Node type reference
 * lives here (the frontend project type-checks Convex modules through
 * `_generated/api`).
 */
export function deploymentEnv(): Record<string, string | undefined> {
  return process.env;
}
