import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";

/** One word of narration with its spoken span in seconds, as written in alignment.json. */
export type AlignedWord = { text: string; start: number; end: number; beat?: number };

/** Group words into short pages the way Shorts captions do: a page gathers words until it spans combineMs. */
export function captionPages(words: AlignedWord[], combineMs: number): TikTokPage[] {
  const captions: Caption[] = words.map((w) => ({
    text: ` ${w.text}`,
    startMs: w.start * 1000,
    endMs: w.end * 1000,
    timestampMs: w.start * 1000,
    confidence: null,
    // a sentence end always ends a page, so the next sentence starts on a fresh page
    ...(/[.?!]$/.test(w.text) ? { pageBreakAfter: true } : {}),
  }));
  return createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: combineMs }).pages;
}

export type CaptionMode = "words" | "sentences";

/** One page per sentence: every word from a sentence start to its closing . ? or !, shown together. */
export function sentencePages(words: AlignedWord[]): TikTokPage[] {
  const pages: TikTokPage[] = [];
  let tokens: TikTokPage["tokens"] = [];
  const flush = () => {
    if (!tokens.length) return;
    pages.push({ text: tokens.map((t) => t.text).join(""), startMs: tokens[0]!.fromMs, durationMs: 0, tokens });
    tokens = [];
  };
  for (const w of words) {
    tokens.push({ text: ` ${w.text}`, fromMs: w.start * 1000, toMs: w.end * 1000 });
    if (/[.?!]$/.test(w.text)) flush();
  }
  flush();
  // like the word grouper, a page lasts until the next one starts; the last ends on its last word
  pages.forEach((p, i) => {
    const next = pages[i + 1];
    p.durationMs = (next ? next.startMs : p.tokens[p.tokens.length - 1]!.toMs) - p.startMs;
  });
  return pages;
}

/** Pages for a caption mode. */
export function pagesFor(words: AlignedWord[], mode: CaptionMode, combineMs: number): TikTokPage[] {
  return mode === "sentences" ? sentencePages(words) : captionPages(words, combineMs);
}

/**
 * The page on screen at tMs, or null. A page stays up until the next page starts, but no longer
 * than holdMs after its last word ends, so captions clear during a long pause.
 */
export function pageAt(pages: TikTokPage[], tMs: number, holdMs: number): { page: TikTokPage; index: number } | null {
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index]!;
    const lastEnd = page.tokens[page.tokens.length - 1]?.toMs ?? page.startMs;
    // the grouper ends the final page on its last word, so give it the same hold as the others
    const nextStart = index + 1 < pages.length ? page.startMs + page.durationMs : Infinity;
    const until = Math.min(nextStart, lastEnd + holdMs);
    if (tMs >= page.startMs && tMs < until) return { page, index };
  }
  return null;
}

/** Index of the token being spoken at tMs: the latest one that has started. */
export function activeToken(page: TikTokPage, tMs: number): number {
  let active = 0;
  page.tokens.forEach((tok, i) => {
    if (tMs >= tok.fromMs) active = i;
  });
  return active;
}
