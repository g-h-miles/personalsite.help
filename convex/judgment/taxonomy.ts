/**
 * Shared, dependency-free taxonomy: help-wanted focuses, scorecard dimensions
 * and their groups, roles, and the pure weighting/ordering functions.
 *
 * Imported by both Convex functions and the frontend, so keep it free of
 * runtime dependencies (no Effect, no Convex server imports).
 */

export const ROLES = ["designer", "engineer", "ai-developer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  designer: "Designer",
  engineer: "Engineer",
  "ai-developer": "AI developer",
};

export const SCORE_LEVELS = ["poor", "weak", "fair", "good", "excellent"] as const;
export type ScoreLevel = (typeof SCORE_LEVELS)[number];

export const HELP_WANTED = [
  "selling-myself",
  "background",
  "content",
  "experience",
  "design",
  "overall",
] as const;
export type HelpWanted = (typeof HELP_WANTED)[number];

export const HELP_WANTED_LABELS: Record<HelpWanted, string> = {
  "selling-myself": "Selling myself",
  background: "My background",
  content: "Content",
  experience: "Experience",
  design: "Design",
  overall: "Overall",
};

export const DIMENSION_GROUPS = {
  sell: ["clarity", "background", "memorability", "callToAction"],
  craft: ["visualHierarchy", "typography", "copyQuality", "accessibility"],
} as const;
export type DimensionGroup = keyof typeof DIMENSION_GROUPS;

export const DIMENSION_GROUP_LABELS: Record<DimensionGroup, string> = {
  sell: "Does it sell you",
  craft: "Craft",
};

export const DIMENSIONS = [...DIMENSION_GROUPS.sell, ...DIMENSION_GROUPS.craft] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export function dimensionGroup(d: Dimension): DimensionGroup {
  return (DIMENSION_GROUPS.sell as readonly Dimension[]).includes(d) ? "sell" : "craft";
}

export const DIMENSION_LABELS: Record<Dimension, string> = {
  clarity: "Clarity of who you are",
  background: "Communicates background",
  memorability: "Memorability & voice",
  callToAction: "Call to action",
  visualHierarchy: "Visual hierarchy",
  typography: "Typography",
  copyQuality: "Copy quality",
  accessibility: "Accessibility basics",
};

/** Which dimensions each help-wanted focus is about. `overall` boosts nothing (all equal). */
export const HELP_WANTED_DIMENSIONS: Record<HelpWanted, readonly Dimension[]> = {
  "selling-myself": ["clarity", "memorability", "callToAction"],
  background: ["background", "clarity"],
  content: ["copyQuality", "clarity"],
  experience: ["visualHierarchy", "accessibility"],
  design: ["visualHierarchy", "typography"],
  overall: [],
};

/** Extra weight a dimension gets per requested focus that covers it. */
export const FOCUS_BOOST = 1;

/**
 * Pure: weight per dimension given the site's help-wanted focuses.
 * Every dimension starts at 1; each requested focus adds FOCUS_BOOST to the
 * dimensions it covers.
 */
export function dimensionWeights(helpWanted: readonly HelpWanted[]): Record<Dimension, number> {
  const weights = Object.fromEntries(DIMENSIONS.map((d) => [d, 1])) as Record<Dimension, number>;
  for (const focus of new Set(helpWanted)) {
    for (const d of HELP_WANTED_DIMENSIONS[focus]) weights[d] += FOCUS_BOOST;
  }
  return weights;
}

/**
 * Pure: display order. Higher weight first; ties keep the canonical order
 * (sell group before craft group).
 */
export function orderDimensions<T extends { dimension: Dimension }>(
  items: readonly T[],
  helpWanted: readonly HelpWanted[],
): T[] {
  const weights = dimensionWeights(helpWanted);
  const canonical = (d: Dimension) => DIMENSIONS.indexOf(d);
  return items.toSorted(
    (a, b) =>
      weights[b.dimension] - weights[a.dimension] ||
      canonical(a.dimension) - canonical(b.dimension),
  );
}
