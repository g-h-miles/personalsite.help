import { ConvexError } from "convex/values";

/** "https://www.jane.dev/work" → "jane.dev/work" */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

/** 0..1 → "72" */
export function formatOverall(overall: number | null | undefined): string {
  return overall == null ? "—" : String(Math.round(overall * 100));
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(ms: number, now = Date.now()): string {
  const seconds = Math.round((ms - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Date(ms).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

const DAY = 24 * 60 * 60 * 1000;

/** Whole days since `ms`: "1 day", "3 days". */
export function daysSince(ms: number, now = Date.now()): string {
  const n = Math.max(0, Math.floor((now - ms) / DAY));
  return `${n} ${n === 1 ? "day" : "days"}`;
}

/** User-facing message from a Convex mutation error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return "Something went wrong. Please try again.";
}
