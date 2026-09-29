/**
 * Cheap, dependency-free metrics extracted from a page's HTML.
 *
 * The scorecard judges these extracted signals (per the spec: DOM/content/style
 * metrics, not raw screenshots). This is intentionally a rough first pass using
 * regular expressions — it only needs to be good enough to give a judgment
 * model useful evidence. A vision-model or headless-browser extractor can
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

function inlineCss(html: string): string {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1] ?? "");
  const attrs = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1] ?? "");
  return [...blocks, ...attrs].join("\n");
}

function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSiteMetrics(html: string): SiteMetrics {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() || null;

  const headingLevels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
  let headingLevelsSkipped = false;
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1] ?? 1;
    const cur = headingLevels[i] ?? 1;
    if (cur > prev + 1) headingLevelsSkipped = true;
  }

  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithAlt = imgTags.filter((tag) => /\salt\s*=\s*"[^"]+"/i.test(tag)).length;

  const css = inlineCss(html);
  const fontFamilies = new Set(
    [...css.matchAll(/font-family\s*:\s*([^;}"]+)/gi)].map((m) =>
      (m[1] ?? "").split(",")[0]!.trim().replace(/['"]/g, "").toLowerCase(),
    ),
  );
  const colors = new Set(
    (css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/gi) ?? []).map((c) =>
      c.toLowerCase().replace(/\s+/g, ""),
    ),
  );

  const text = visibleText(html);
  const opening = text.split(" ").slice(0, 400).join(" ");

  return {
    title,
    hasMetaDescription: /<meta[^>]+name\s*=\s*["']description["'][^>]*>/i.test(html),
    hasViewportMeta: /<meta[^>]+name\s*=\s*["']viewport["'][^>]*>/i.test(html),
    hasLang: /<html[^>]+\slang\s*=\s*["'][^"']+["']/i.test(html),
    h1Count: headingLevels.filter((l) => l === 1).length,
    headingCount: headingLevels.length,
    headingLevelsSkipped,
    imageCount: imgTags.length,
    imagesWithAlt,
    inputCount: count(html, /<(input|textarea|select)\b(?![^>]*type\s*=\s*["']hidden["'])/gi),
    labelCount: count(html, /<label\b/gi),
    linkCount: count(html, /<a\b[^>]*href/gi),
    wordCount: text ? text.split(" ").length : 0,
    fontFamilyCount: fontFamilies.size,
    colorCount: colors.size,
    externalStylesheetCount: count(html, /<link[^>]+rel\s*=\s*["']stylesheet["']/gi),
    hasFirstPersonIntro: /\b(i'm|i am|hi,? i|hello,? i|my name is)\b/i.test(opening),
    backgroundMentions: count(
      text,
      /\b(experience|worked|working at|previously|resume|résumé|cv|clients|founded|studied|years)\b/gi,
    ),
    hasContactLink:
      /href\s*=\s*["'](mailto:|[^"']*\/contact|[^"']*(linkedin\.com|cal\.com|calendly\.com))/i.test(
        html,
      ),
  };
}
