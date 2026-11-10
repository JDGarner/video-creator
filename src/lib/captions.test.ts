import { describe, expect, it } from "vitest";
import { activeToken, captionPages, pageAt, type AlignedWord } from "./captions";

// beat 1 and the start of beat 2 from the real alignment, with the 0.5 s gap between them
const WORDS: AlignedWord[] = [
  { text: "Long", start: 0.08, end: 0.24 },
  { text: "before", start: 0.24, end: 0.61 },
  { text: "the", start: 0.61, end: 0.79 },
  { text: "British", start: 0.79, end: 1.21 },
  { text: "arrived,", start: 1.21, end: 1.8 },
  { text: "northern", start: 1.8, end: 2.16 },
  { text: "Australia", start: 2.16, end: 2.58 },
  { text: "was", start: 2.58, end: 2.74 },
  { text: "already", start: 2.74, end: 3.11 },
  { text: "part", start: 3.11, end: 3.32 },
  { text: "of", start: 3.32, end: 3.43 },
  { text: "an", start: 3.44, end: 3.53 },
  { text: "international", start: 3.56, end: 4.24 },
  { text: "trade", start: 4.24, end: 5.0 },
  { text: "network.", start: 5.0, end: 5.48 },
  { text: "Every", start: 6.13, end: 6.41 },
  { text: "year,", start: 6.41, end: 6.75 },
];

describe("captionPages", () => {
  const pages = captionPages(WORDS, 900);

  it("keeps every word exactly once, in order", () => {
    const texts = pages.flatMap((p) => p.tokens.map((t) => t.text.trim()));
    expect(texts).toEqual(WORDS.map((w) => w.text));
  });

  it("makes short pages", () => {
    for (const p of pages) expect(p.tokens.length).toBeLessThanOrEqual(4);
    expect(pages.length).toBeGreaterThan(3);
  });

  it("ends a page at a sentence end", () => {
    const ending = pages.find((p) => p.tokens.some((t) => t.text.trim() === "network."))!;
    expect(ending.tokens[ending.tokens.length - 1]!.text.trim()).toBe("network.");
  });

  it("starts each page on its first word", () => {
    for (const p of pages) expect(p.startMs).toBe(p.tokens[0]!.fromMs);
  });
});

describe("pageAt", () => {
  const pages = captionPages(WORDS, 900);

  it("shows the first page at the first word", () => {
    expect(pageAt(pages, 100, 400)?.index).toBe(0);
  });

  it("clears during the gap between beats once the hold has passed", () => {
    expect(pageAt(pages, 5600, 400)).not.toBeNull(); // 120 ms after "network." ends
    expect(pageAt(pages, 6000, 400)).toBeNull(); // 520 ms after, before "Every" at 6130
    expect(pageAt(pages, 6200, 400)?.page.tokens[0]!.text).toBe("Every");
  });

  it("holds the final page after its last word", () => {
    expect(pageAt(pages, 6750 + 200, 400)?.page.tokens.at(-1)!.text.trim()).toBe("year,");
    expect(pageAt(pages, 6750 + 600, 400)).toBeNull();
  });

  it("is empty before narration starts", () => {
    expect(pageAt(pages, 0, 400)).toBeNull();
  });
});

describe("activeToken", () => {
  it("picks the latest word that has started", () => {
    const [first] = captionPages(WORDS, 900);
    expect(activeToken(first!, first!.tokens[0]!.fromMs)).toBe(0);
    expect(activeToken(first!, first!.tokens[1]!.fromMs + 10)).toBe(1);
  });
});
