import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "../convex/lib/url";

describe("normalizeSiteUrl", () => {
  it("accepts public http(s) URLs and normalizes them for de-duplication", () => {
    expect(normalizeSiteUrl(" https://www.Jane.dev/work/#top ")).toEqual({
      url: "https://www.jane.dev/work/",
      normalized: "jane.dev/work",
    });
    expect(normalizeSiteUrl("http://jane.co.uk")?.normalized).toBe("jane.co.uk");
    // Only the suffixes are reserved, not names that merely contain them.
    expect(normalizeSiteUrl("https://local.dev")).not.toBeNull();
    expect(normalizeSiteUrl("https://internal.jane.dev")).not.toBeNull();
  });

  it.each([
    "not a url",
    "ftp://jane.dev",
    "http://localhost",
    "http://intranet",
    "http://127.0.0.1",
    "http://[::1]",
    "https://user:pass@jane.dev",
    "http://localhost.",
    "http://jane.dev.",
    "http://foo.localhost",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://printer.local",
    "http://FOO.LOCALHOST",
  ])("rejects %s", (input) => {
    expect(normalizeSiteUrl(input)).toBeNull();
  });
});
