import type { AuthConfig } from "convex/server";

/**
 * Convex <-> Clerk integration.
 *
 * Set the issuer (your Clerk Frontend API URL, e.g. https://xxx.clerk.accounts.dev)
 * on the Convex deployment:
 *   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://xxx.clerk.accounts.dev
 *
 * The Clerk "Convex" integration must be activated in the Clerk dashboard so
 * Clerk issues tokens with the `convex` audience.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
