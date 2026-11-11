import { describe, expect, it } from "vitest";
import { fullDescription, parsePublish, parseTime, srt } from "./publish";

const STORY = `# Short: Example

## Narration

1. One.

## Publish

title: A title
tags: history, maps
hashtags: shorts #history
thumbnail: 0:09

First paragraph of the description.

Second paragraph.

## Production notes

Not parsed.
`;

describe("parsePublish", () => {
  it("reads fields and the description", () => {
    const p = parsePublish(STORY)!;
    expect(p.title).toBe("A title");
    expect(p.tags).toEqual(["history", "maps"]);
    expect(p.hashtags).toEqual(["#shorts", "#history"]);
    expect(p.thumbnailSec).toBe(9);
    expect(p.description).toBe("First paragraph of the description.\n\nSecond paragraph.");
    expect(fullDescription(p)).toBe("First paragraph of the description.\n\nSecond paragraph.\n\n#shorts #history");
  });

  it("returns null without a section", () => {
    expect(parsePublish("# Short\n\n## Narration\n\n1. One.\n")).toBeNull();
  });

  it("requires a title and rejects unknown fields", () => {
    expect(() => parsePublish("## Publish\n\ntags: a\n\nText.")).toThrow(/title is required/);
    expect(() => parsePublish("## Publish\n\ntitle: x\ntitel: y\n")).toThrow(/unknown field/);
    expect(() => parsePublish(`## Publish\n\ntitle: ${"x".repeat(101)}\n`)).toThrow(/max 100/);
  });

  it("parses times", () => {
    expect(parseTime("9")).toBe(9);
    expect(parseTime("1:05.5")).toBe(65.5);
  });
});

describe("srt", () => {
  it("breaks on sentence ends and beats, holds without overlapping", () => {
    const out = srt([
      { text: "Long", start: 0.09, end: 0.22, beat: 1 },
      { text: "before.", start: 0.22, end: 0.45, beat: 1 },
      { text: "Every", start: 0.5, end: 0.7, beat: 2 },
      { text: "year,", start: 0.7, end: 1.0, beat: 2 },
      { text: "fleets", start: 2.5, end: 2.9, beat: 2 },
    ]);
    expect(out).toBe(
      "1\n00:00:00,090 --> 00:00:00,500\nLong before.\n\n" +
        "2\n00:00:00,500 --> 00:00:01,300\nEvery year,\n\n" +
        "3\n00:00:02,500 --> 00:00:03,200\nfleets\n",
    );
  });

  it("splits long runs", () => {
    const words = Array.from({ length: 30 }, (_, i) => ({ text: "word", start: i, end: i + 0.5, beat: 1 }));
    const cues = srt(words).trim().split("\n\n");
    expect(cues.length).toBeGreaterThan(1);
    for (const c of cues) expect(c.split("\n")[2]!.length).toBeLessThanOrEqual(60);
  });
});
