import { describe, expect, it } from "vitest";
import { checkStory, parseAssets, parseNarration, parseScenes, parseStory, sections } from "./story";
import type { Narration } from "./narration";

const STORY = `# Short: Example

**Deliverable:** test

## Narration

1. Long before the British arrived.
2. Every **year**, fleets sailed.

## Scenes

\`\`\`yaml
- type: still
  image: landscape.jpg
  headline: Before
- type: card
  from: year
  transition: fade
  image: ship.png
  headline: THE SHIP
  caption: a prau
\`\`\`

## Publish

title: A title

Text.
`;

const N: Narration = {
  duration: 8,
  beats: [
    { n: 1, text: "", start: 0, end: 3 },
    { n: 2, text: "", start: 3.5, end: 7 },
  ],
  words: [
    { text: "Long", start: 0.1, end: 0.3, beat: 1 },
    { text: "Every", start: 3.6, end: 3.9, beat: 2 },
    { text: "year,", start: 3.9, end: 4.2, beat: 2 },
  ],
};

describe("story", () => {
  it("splits sections and parses narration", () => {
    expect(sections(STORY).map((s) => s.name)).toEqual(["Narration", "Scenes", "Publish"]);
    expect(parseNarration(STORY)).toEqual([
      { n: 1, text: "Long before the British arrived." },
      { n: 2, text: "Every year, fleets sailed." },
    ]);
  });

  it("parses scenes with defaults", () => {
    const scenes = parseScenes(STORY)!;
    expect(scenes).toHaveLength(2);
    expect(scenes[0]!.type).toBe("still");
    expect(scenes[0]!.transition).toBe("cut");
    expect(scenes[1]!.transition).toBe("fade");
    expect(parseStory(STORY).title).toBe("Example");
    expect(parseScenes("# x\n\n## Narration\n\n1. a\n")).toBeNull();
  });

  it("passes a clean storyboard", () => {
    expect(checkStory(STORY, { narration: N, assets: new Set(["landscape.jpg", "ship.png"]) })).toEqual([]);
  });

  it("finds the things that break stages later", () => {
    const bad = STORY.replace("2. Every", "3. Every").replace("## Publish\n\ntitle: A title", "## Publish\n\ntitle: TODO title").replace("image: landscape.jpg", "image: missing.jpg");
    const msgs = checkStory(bad, { narration: N, assets: new Set(["ship.png"]) }).map((f) => `${f.level}: ${f.message}`);
    expect(msgs).toContainEqual(expect.stringMatching(/error: narration item numbered 3/));
    expect(msgs).toContainEqual(expect.stringMatching(/error: Publish title still has a TODO/));
    expect(msgs).toContainEqual(expect.stringMatching(/error: scenes use "missing.jpg"/));
  });

  it("checks cues against the narration and warns on digits", () => {
    const s = STORY.replace("from: year", "from: kangaroo").replace("1. Long before", "1. In 1788, long before");
    const msgs = checkStory(s, { narration: N }).map((f) => f.message);
    expect(msgs).toContainEqual(expect.stringMatching(/scene 2 \(card\) from: cue "kangaroo"/));
    expect(msgs).toContainEqual(expect.stringMatching(/beat 1 has digits \("1788,"\)/));
  });

  it("rejects an invalid scene with a readable message", () => {
    expect(() => parseScenes("## Scenes\n\n```yaml\n- type: card\n  image: a.png\n```\n")).toThrow(/scene 1 headline/);
  });

  it("parses assets", () => {
    expect(parseAssets("- file: a.png\n  source: https://x\n  licence: CC0\n")).toHaveLength(1);
    expect(() => parseAssets("- file: a.png\n  source: x\n  licence: CC0\n- file: a.png\n  source: y\n  licence: CC0\n")).toThrow(/twice/);
  });
});
