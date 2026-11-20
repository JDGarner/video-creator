import { describe, expect, it } from "vitest";
import { cueError, parseCue, resolveCue } from "./cues";
import type { Narration } from "./narration";

const N: Narration = {
  duration: 10,
  beats: [
    { n: 1, text: "Long before.", start: 0, end: 4 },
    { n: 2, text: "Every year, every day.", start: 4.5, end: 9 },
  ],
  words: [
    { text: "Long", start: 0.1, end: 0.3, beat: 1 },
    { text: "before.", start: 0.3, end: 0.8, beat: 1 },
    { text: "Every", start: 4.6, end: 4.9, beat: 2 },
    { text: "year,", start: 4.9, end: 5.2, beat: 2 },
    { text: "every", start: 5.3, end: 5.5, beat: 2 },
    { text: "day.", start: 5.5, end: 5.9, beat: 2 },
  ],
};

describe("cues", () => {
  it("parses every form", () => {
    expect(parseCue(3)).toEqual({ kind: "sec", sec: 3 });
    expect(parseCue("2.5 + 1")).toEqual({ kind: "sec", sec: 3.5 });
    expect(parseCue("beat 2 end - 0.5")).toEqual({ kind: "beat", n: 2, edge: "end", offset: -0.5 });
    expect(parseCue("every#2")).toEqual({ kind: "word", word: "every", occurrence: 2, offset: 0 });
  });

  it("resolves against the narration", () => {
    expect(resolveCue("beat 2", N)).toBe(4.5);
    expect(resolveCue("beat 1 end", N)).toBe(4);
    expect(resolveCue("Before", N)).toBe(0.3);
    expect(resolveCue("every#2 + 0.2", N)).toBeCloseTo(5.5);
    expect(resolveCue("end - 1", N)).toBe(9);
  });

  it("reports missing words and beats", () => {
    expect(cueError("beat 3", N)).toMatch(/no beat 3/);
    expect(cueError("kangaroo", N)).toMatch(/not in the narration/);
    expect(cueError("every#3", N)).toMatch(/only spoken 2/);
    expect(cueError("beat two", N)).toMatch(/bad cue/);
  });
});
