import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** The signed-in user's document, or null (anonymous, or not yet stored). */
export async function getViewer(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * The signed-in user's document, creating it from the Clerk identity on first
 * use. Throws if not signed in.
 */
export async function requireViewer(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("You need to sign in to do that.");

  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (existing) {
    if (identity.pictureUrl && identity.pictureUrl !== existing.imageUrl) {
      await ctx.db.patch(existing._id, { imageUrl: identity.pictureUrl });
    }
    return existing;
  }

  const displayName =
    identity.name ?? identity.nickname ?? identity.email?.split("@")[0] ?? "New member";
  const id = await ctx.db.insert("users", {
    clerkId: identity.subject,
    displayName,
    imageUrl: identity.pictureUrl,
    roles: [],
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create user");
  return created;
}
