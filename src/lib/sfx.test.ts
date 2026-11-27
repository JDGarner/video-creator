import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SFX, SFX_NAMES, sfxFile, transitionSound } from "./sfx";

describe("sfx", () => {
  it("has every file the catalogue promises, at a sane length and level", () => {
    expect(SFX_NAMES).toEqual(expect.arrayContaining(["flick", "whoosh", "woodblock", "thump", "sweep"]));
    for (const name of SFX_NAMES) {
      expect(existsSync(path.resolve("public", sfxFile(name)))).toBe(true);
      expect(SFX[name].sec).toBeGreaterThan(0.1);
      expect(SFX[name].sec).toBeLessThan(1.5);
      expect(SFX[name].gain).toBeGreaterThan(0);
      expect(SFX[name].gain).toBeLessThanOrEqual(1);
    }
  });

  it("the stamp is the only cue louder than the rest", () => {
    const soft = SFX_NAMES.filter((n) => n !== "thump");
    for (const n of soft) expect(SFX[n].gain).toBeLessThan(SFX.thump.gain);
  });

  it("picks the transition sound", () => {
    expect(transitionSound("cut", 0)).toBeNull();
    expect(transitionSound("fade", 0)).toBeNull();
    expect(transitionSound("cut", 3)).toBe("flick");
    expect(transitionSound("fade", 3)).toBe("whoosh");
  });
});
