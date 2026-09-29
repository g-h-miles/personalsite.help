import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchPageHtml,
  MAX_HTML_BYTES,
  MAX_REDIRECTS,
  readTextCapped,
} from "../convex/lib/fetchPage";

const redirect = (location: string, status = 302) =>
  new Response(null, { status, headers: { location } });

/** Stub fetch with a map of URL → response; records the URLs requested. */
function stubFetch(routes: Record<string, () => Response>) {
  const requested: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requested.push(url);
    expect(init?.redirect).toBe("manual");
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return route();
  });
  vi.stubGlobal("fetch", fetchMock);
  return requested;
}

/** Routes for /0 → /1 → … → /hops, which finally answers "done". */
function chain(hops: number) {
  const routes: Record<string, () => Response> = {};
  for (let i = 0; i < hops; i++) {
    routes[`https://jane.dev/${i}`] = () => redirect(`/${i + 1}`);
  }
  routes[`https://jane.dev/${hops}`] = () => new Response("done");
  return routes;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPageHtml redirects", () => {
  it("follows public redirects, resolving relative Locations", async () => {
    const requested = stubFetch({
      "https://jane.dev/": () => redirect("https://www.jane.dev/", 301),
      "https://www.jane.dev/": () => redirect("/home"),
      "https://www.jane.dev/home": () => new Response("<h1>Hi</h1>"),
    });
    expect(await fetchPageHtml("https://jane.dev")).toBe("<h1>Hi</h1>");
    expect(requested).toEqual([
      "https://jane.dev/",
      "https://www.jane.dev/",
      "https://www.jane.dev/home",
    ]);
  });

  it.each([
    "http://localhost:3000/admin",
    "http://127.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://intranet/",
    "file:///etc/passwd",
    "https://user:pass@jane.dev/",
  ])("refuses to follow a redirect to %s", async (location) => {
    const requested = stubFetch({ "https://jane.dev/": () => redirect(location) });
    await expect(fetchPageHtml("https://jane.dev")).rejects.toThrow(/non-public|Invalid/);
    expect(requested).toEqual(["https://jane.dev/"]);
  });

  it(`follows at most ${MAX_REDIRECTS} redirects`, async () => {
    stubFetch(chain(MAX_REDIRECTS));
    expect(await fetchPageHtml("https://jane.dev/0")).toBe("done");

    const requested = stubFetch(chain(MAX_REDIRECTS + 1));
    await expect(fetchPageHtml("https://jane.dev/0")).rejects.toThrow(/redirects/);
    expect(requested).toHaveLength(MAX_REDIRECTS + 1);
  });

  it("fails on a redirect without a Location, and on HTTP errors", async () => {
    stubFetch({ "https://jane.dev/": () => new Response(null, { status: 302 }) });
    await expect(fetchPageHtml("https://jane.dev")).rejects.toThrow(/Location/);
    stubFetch({ "https://jane.dev/": () => new Response("nope", { status: 500 }) });
    await expect(fetchPageHtml("https://jane.dev")).rejects.toThrow("HTTP 500");
  });

  it("refuses a non-public starting URL without fetching", async () => {
    const requested = stubFetch({});
    await expect(fetchPageHtml("http://localhost/")).rejects.toThrow(/non-public/);
    expect(requested).toEqual([]);
  });
});

describe("readTextCapped", () => {
  it(`stops reading at ${MAX_HTML_BYTES} bytes and cancels the download`, async () => {
    const chunk = new Uint8Array(64 * 1024).fill(0x61); // "aaaa…"
    let pulled = 0;
    const cancel = vi.fn();
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(chunk);
      },
      cancel,
    });

    const text = await readTextCapped(new Response(endless), MAX_HTML_BYTES);
    expect(text).toHaveLength(MAX_HTML_BYTES);
    expect(cancel).toHaveBeenCalled();
    // Stopped at the cap instead of draining the stream (plus the stream's small read-ahead).
    expect(pulled).toBeLessThanOrEqual(Math.ceil(MAX_HTML_BYTES / chunk.byteLength) + 2);
  });

  it("decodes UTF-8 split across chunks", async () => {
    const bytes = new TextEncoder().encode("résumé ✓");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const b of bytes) controller.enqueue(new Uint8Array([b]));
        controller.close();
      },
    });
    expect(await readTextCapped(new Response(body), 1000)).toBe("résumé ✓");
  });

  it("is used by fetchPageHtml instead of reading the whole body", async () => {
    const big = "a".repeat(MAX_HTML_BYTES + 5000);
    stubFetch({ "https://jane.dev/": () => new Response(big) });
    expect(await fetchPageHtml("https://jane.dev")).toHaveLength(MAX_HTML_BYTES);
  });
});
