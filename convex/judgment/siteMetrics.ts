/**
 * Cheap, dependency-free metrics extracted from a page's HTML.
 *
 * The scorecard judges these extracted signals (per the spec: DOM/content/style
 * metrics, not raw screenshots). This is intentionally a rough first pass using
 * regular expressions — it only needs to be good enough to give a judgment
 * model useful evidence. The HTML comes from arbitrary sites, so every pass
 * must stay linear: no pattern that rescans the rest of the document from each
 * unclosed tag or quote (see scanElements and tagsOf). A vision-model or headless-browser extractor can
 * replace it later without changing the scorecard.
 */

export interface SiteMetrics {
  title: string | null;
  hasMetaDescription: boolean;
  hasViewportMeta: boolean;
  hasLang: boolean;
  h1Count: number;
  headingCount: number;
  /** e.g. an h2 followed directly by an h4. */
  headingLevelsSkipped: boolean;
  imageCount: number;
  imagesWithAlt: number;
  inputCount: number;
  labelCount: number;
  linkCount: number;
  wordCount: number;
  /** Distinct font-family declarations found in inline CSS. 0 = unknown. */
  fontFamilyCount: number;
  /** Distinct color literals found in inline CSS. 0 = unknown. */
  colorCount: number;
  externalStylesheetCount: number;
  /** "I'm …" / "Hi, I …" / "my name is" near the top of the page. */
  hasFirstPersonIntro: boolean;
  /** Mentions of work history words: experience, worked, resume, clients, … */
  backgroundMentions: number;
  /** mailto:, a contact page, or a scheduling / social profile link. */
  hasContactLink: boolean;
}

function count(html: string, re: RegExp): number {
  return html.match(re)?.length ?? 0;
}

/**
 * Split `html` around the given elements in one forward pass: the text outside
 * them, and the contents of each closed one. Linear time even on hostile input,
 * unlike a lazy `<tag>[\s\S]*?</tag>` regex, which rescans the rest of the
 * document for every unclosed tag. An unclosed element swallows the rest of the
 * document (it is dropped from `outside` and not returned in `inside`).
 */
function scanElements(html: string, tags: readonly string[]) {
  const open = new RegExp(`<(${tags.join("|")})\\b`, "gi");
  const outside: string[] = [];
  const inside: string[] = [];
  let pos = 0;
  for (;;) {
    open.lastIndex = pos;
    const start = open.exec(html);
    if (!start) break;
    outside.push(html.slice(pos, start.index));
    const bodyStart = html.indexOf(">", open.lastIndex) + 1;
    if (bodyStart === 0) return { outside, inside };
    const close = new RegExp(`</${start[1]}\\s*>`, "gi");
    close.lastIndex = bodyStart;
    const end = close.exec(html);
    if (!end) return { outside, inside };
    inside.push(html.slice(bodyStart, end.index));
    pos = close.lastIndex;
  }
  outside.push(html.slice(pos));
  return { outside, inside };
}

/**
 * Every start tag and its name, in one linear pass. An unclosed tag runs to the
 * end of the document, as it does in a browser. Attribute checks then run on
 * one tag at a time instead of on the whole document.
 */
function tagsOf(html: string): { name: string; tag: string }[] {
  return (html.match(/<[a-z][^>]*(?:>|$)/gi) ?? []).map((tag) => ({
    name: /^<([a-z][a-z0-9-]*)/i.exec(tag)?.[1]?.toLowerCase() ?? "",
    tag,
  }));
}

function inlineCss(html: string): string {
  const blocks = scanElements(html, ["style"]).inside;
  const attrs = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)/gi)].map((m) => m[1] ?? "");
  return [...blocks, ...attrs].join("\n");
}

function visibleText(html: string): string {
  return scanElements(html, ["script", "style", "noscript", "svg", "template"])
    .outside.join(" ")
    .replace(/<[^>]*(?:>|$)/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSiteMetrics(html: string): SiteMetrics {
  const title = scanElements(html, ["title"]).inside[0]?.replace(/\s+/g, " ").trim() || null;

  const headingLevels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
  let headingLevelsSkipped = false;
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1] ?? 1;
    const cur = headingLevels[i] ?? 1;
    if (cur > prev + 1) headingLevelsSkipped = true;
  }

  const tags = tagsOf(html);
  const named = (name: string) => tags.filter((t) => t.name === name).map((t) => t.tag);
  const metas = named("meta");
  const imgTags = named("img");
  const imagesWithAlt = imgTags.filter((tag) => /\salt\s*=\s*"[^"]/i.test(tag)).length;
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']*)/gi)].map((m) => m[1] ?? "");

  const css = inlineCss(html);
  const fontFamilies = new Set(
    [...css.matchAll(/font-family\s*:\s*([^;}"]+)/gi)].map((m) =>
      (m[1] ?? "").split(",")[0]!.trim().replace(/['"]/g, "").toLowerCase(),
    ),
  );
  const colors = new Set(
    (css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)?|hsla?\([^)]*\)?|oklch\([^)]*\)?/gi) ?? []).map(
      (c) => c.toLowerCase().replace(/\s+/g, ""),
    ),
  );

  const text = visibleText(html);
  const opening = text.split(" ").slice(0, 400).join(" ");

  return {
    title,
    hasMetaDescription: metas.some((tag) => /\sname\s*=\s*["']description["']/i.test(tag)),
    hasViewportMeta: metas.some((tag) => /\sname\s*=\s*["']viewport["']/i.test(tag)),
    hasLang: named("html").some((tag) => /\slang\s*=\s*["']?[a-z]/i.test(tag)),
    h1Count: headingLevels.filter((l) => l === 1).length,
    headingCount: headingLevels.length,
    headingLevelsSkipped,
    imageCount: imgTags.length,
    imagesWithAlt,
    inputCount: tags.filter(
      (t) =>
        (t.name === "input" || t.name === "textarea" || t.name === "select") &&
        !/type\s*=\s*["']hidden["']/i.test(t.tag),
    ).length,
    labelCount: count(html, /<label\b/gi),
    linkCount: named("a").filter((tag) => /href/i.test(tag)).length,
    wordCount: text ? text.split(" ").length : 0,
    fontFamilyCount: fontFamilies.size,
    colorCount: colors.size,
    externalStylesheetCount: named("link").filter((tag) =>
      /rel\s*=\s*["']stylesheet["']/i.test(tag),
    ).length,
    hasFirstPersonIntro: /\b(i'm|i am|hi,? i|hello,? i|my name is)\b/i.test(opening),
    backgroundMentions: count(
      text,
      /\b(experience|worked|working at|previously|resume|résumé|cv|clients|founded|studied|years)\b/gi,
    ),
    hasContactLink: hrefs.some(
      (href) =>
        /^mailto:/i.test(href) || /\/contact|linkedin\.com|cal\.com|calendly\.com/i.test(href),
    ),
  };
}
