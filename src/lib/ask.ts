import type { HelpWanted, Role } from "@convex/judgment/taxonomy";
import { CONTEXT_MAX } from "@convex/lib/config";

/**
 * The person's question, as it appears on the wall. Owners can write their own
 * (stored as the site's `context`); otherwise we ask on their behalf, based on
 * the first thing they want help with.
 */
export const DEFAULT_QUESTIONS: Record<HelpWanted, string> = {
  "selling-myself": "Would a stranger want to work with me after reading this?",
  background: "Does my story and experience come through clearly?",
  content: "Is the writing clear, and would you keep reading?",
  experience: "Is it easy and pleasant to find your way around?",
  design: "Do the type, color and layout hold up?",
  overall: "Be honest: does my site sell me?",
};

/** Short prompts shown on the "pick one or more" tiles. */
export const HELP_WANTED_DESCRIPTIONS: Record<HelpWanted, string> = {
  "selling-myself": "Would a stranger want to work with me after reading this?",
  background: "Does my story and experience come through clearly?",
  content: "Is the writing clear, and would you keep reading?",
  experience: "Is it easy and pleasant to find your way around?",
  design: "Type, color, layout and polish.",
  overall: "Everything. Be honest with me.",
};

/** Max length of the owner's own question on the submit form (stored as `context`). */
export const QUESTION_MAX = CONTEXT_MAX;

/** Strip wrapping quotes so we can add our own curly ones. */
function unquote(text: string): string {
  return text.trim().replace(/^["“”'‘’]+|["“”'‘’]+$/g, "");
}

/** The question without quotes: the owner's own words, or a default for their ask. */
export function askQuestion(context: string | undefined, helpWanted: readonly HelpWanted[]) {
  const own = context ? unquote(context) : "";
  if (own) return own;
  return DEFAULT_QUESTIONS[helpWanted[0] ?? "overall"];
}

/**
 * Cut `text` to at most `max` characters, ending on a word with an ellipsis.
 * For older questions saved before the limit was lowered.
 */
export function truncate(text: string, max = QUESTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** “The question”, in curly quotes. */
export function quoted(text: string): string {
  return `“${text}”`;
}

/** "designer, engineer" — role lenses as mono metadata. */
export function rolesLine(roles: readonly Role[]): string {
  return roles.join(", ");
}

/** "designer · asks" (or just "asks" when no roles are set). */
export function asksLine(roles: readonly Role[]): string {
  return roles.length > 0 ? `${rolesLine(roles)} · asks` : "asks";
}

/** "Nora Okafor" → "Nora" */
export function firstName(displayName: string | undefined): string {
  return displayName?.trim().split(/\s+/)[0] || "them";
}
