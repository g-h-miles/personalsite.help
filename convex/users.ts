import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer, requireViewer } from "./lib/auth";
import { MAX_ROLES } from "./lib/config";
import { role } from "./schema";

/** The signed-in user (null if anonymous or not stored yet). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      displayName: user.displayName,
      imageUrl: user.imageUrl,
      roles: user.roles,
      siteId: user.siteId,
    };
  },
});

/** Create or refresh the user document from the Clerk identity. Called after sign-in. */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    return user._id;
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
    roles: v.array(role),
  },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    const displayName = args.displayName.trim();
    if (displayName.length < 1 || displayName.length > 60) {
      throw new ConvexError("Display name must be 1–60 characters.");
    }
    const roles = [...new Set(args.roles)];
    if (roles.length > MAX_ROLES) {
      throw new ConvexError(`Pick at most ${MAX_ROLES} roles.`);
    }
    await ctx.db.patch(user._id, { displayName, roles });
  },
});
