/**
 * Fetch a submitted site's HTML for the scorecard without trusting the site.
 *
 * Redirects are followed by hand so every hop is re-validated with
 * `normalizeSiteUrl` (a public page can't bounce us to localhost or a bare IP),
 * and the body is read as a stream and cut off at `MAX_HTML_BYTES`, so a huge
 * or endless response can't exhaust the action's memory.
 */
import { normalizeSiteUrl } from "./url";

/** Redirect hops followed before giving up. */
export const MAX_REDIRECTS = 5;

/** Bytes of HTML read before the download is cancelled (1 MB). */
export const MAX_HTML_BYTES = 1_000_000;

const USER_AGENT = "personalsite.help scorecard (+https://personalsite.help)";

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/**
 * GET `url`, following up to `MAX_REDIRECTS` validated redirects, and return at
 * most `MAX_HTML_BYTES` of the body as text. Throws with a descriptive message
 * (for server logs, not for users) on any failure.
 */
export async function fetchPageHtml(url: string, signal?: AbortSignal): Promise<string> {
  let current = normalizeSiteUrl(url)?.url;
  if (!current) throw new Error(`Refusing to fetch a non-public URL: ${url}`);

  for (let hops = 0; ; hops++) {
    const res = await fetch(current, {
      signal,
      headers: { "user-agent": USER_AGENT },
      redirect: "manual",
    });

    if (isRedirect(res.status)) {
      await res.body?.cancel();
      const location = res.headers.get("location");
      if (!location) throw new Error(`HTTP ${res.status} without a Location header`);
      if (hops >= MAX_REDIRECTS) throw new Error(`More than ${MAX_REDIRECTS} redirects`);
      let next: string;
      try {
        next = new URL(location, current).toString();
      } catch {
        throw new Error(`Invalid redirect Location: ${location}`);
      }
      const safe = normalizeSiteUrl(next);
      if (!safe) throw new Error(`Refusing to follow a redirect to a non-public URL: ${next}`);
      current = safe.url;
      continue;
    }

    // Runtimes that hide manual redirects (status 0) would otherwise look like a failed fetch.
    if (res.type === "opaqueredirect") throw new Error("Opaque redirect");
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`HTTP ${res.status}`);
    }
    return await readTextCapped(res, MAX_HTML_BYTES);
  }
}

/** Read at most `maxBytes` of a response body as UTF-8, cancelling the rest of the download. */
export async function readTextCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk =
        value.byteLength > maxBytes - received ? value.subarray(0, maxBytes - received) : value;
      received += chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    // Stop the download once we have enough; a no-op if the body already ended.
    await reader.cancel().catch(() => {});
  }
}
