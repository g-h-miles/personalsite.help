/**
 * Validate a submitted site URL and produce a key for de-duplication.
 * Returns null if the URL is not an acceptable public http(s) URL.
 */
export function normalizeSiteUrl(input: string): { url: string; normalized: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || /^[\d.]+$/.test(host)) return null;
  // Trailing dots ("localhost.") and names reserved for local/internal networks.
  if (host.endsWith(".") || /\.(localhost|internal|local)$/.test(host)) return null;
  if (parsed.username || parsed.password) return null;

  const path = parsed.pathname.replace(/\/+$/, "");
  const normalized = `${host.replace(/^www\./, "")}${path}`.toLowerCase();
  parsed.hash = "";
  return { url: parsed.toString(), normalized };
}
