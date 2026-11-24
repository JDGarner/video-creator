import type { Narration } from "./narration";

/**
 * A cue names a moment in the narration. In the storyboard it is a number of seconds or a string:
 *   "Diprotodon"        first time the word is spoken
 *   "Diprotodon#2"      second time
 *   "beat 3"            start of beat 3        "beat 3 end"   its end
 *   "end"               end of the narration
 * any of which may take " + 0.5" or " - 0.2" seconds.
 */
export type Cue = number | string;

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

export function parseCue(cue: Cue): { kind: "sec"; sec: number } | { kind: "beat"; n: number; edge: "start" | "end"; offset: number } | { kind: "word"; word: string; occurrence: number; offset: number } | { kind: "end"; offset: number } {
  if (typeof cue === "number") return { kind: "sec", sec: cue };
  const m = cue.trim().match(/^(.*?)\s*(?:([+-])\s*(\d+(?:\.\d+)?))?$/);
  if (!m) throw new Error(`bad cue "${cue}"`);
  const body = m[1]!.trim();
  const offset = m[2] ? (m[2] === "-" ? -1 : 1) * parseFloat(m[3]!) : 0;
  if (/^\d+(\.\d+)?$/.test(body)) return { kind: "sec", sec: parseFloat(body) + offset };
  if (body === "end") return { kind: "end", offset };
  const beat = body.match(/^beat\s+(\d+)(\s+end)?$/i);
  if (beat) return { kind: "beat", n: parseInt(beat[1]!, 10), edge: beat[2] ? "end" : "start", offset };
  const word = body.match(/^([^\s#]+)(?:#(\d+))?$/);
  if (word) return { kind: "word", word: word[1]!, occurrence: word[2] ? parseInt(word[2]!, 10) : 1, offset };
  throw new Error(`bad cue "${cue}": use seconds, "beat N", "beat N end", "end" or a single word, optionally "+ 0.5"`);
}

/** Seconds for a cue against the narration. Throws when the beat or word does not exist. */
export function resolveCue(cue: Cue, narration: Narration): number {
  const p = parseCue(cue);
  if (p.kind === "sec") return p.sec;
  if (p.kind === "end") return narration.duration + p.offset;
  if (p.kind === "beat") {
    const b = narration.beats.find((x) => x.n === p.n);
    if (!b) throw new Error(`cue "${cue}": no beat ${p.n} (narration has ${narration.beats.length})`);
    return (p.edge === "end" ? b.end : b.start) + p.offset;
  }
  const target = norm(p.word);
  const hits = narration.words.filter((w) => norm(w.text) === target);
  const hit = hits[p.occurrence - 1];
  if (!hit) throw new Error(hits.length ? `cue "${cue}": "${p.word}" is only spoken ${hits.length} time(s)` : `cue "${cue}": "${p.word}" is not in the narration`);
  return hit.start + p.offset;
}

/** Cue problems, without throwing, for the storyboard check. */
export function cueError(cue: Cue, narration: Narration): string | null {
  try {
    resolveCue(cue, narration);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** True when the narration was made with `--beats` and covers only part of the script. */
export function isPartial(narration: Narration, scriptBeats = narration.scriptBeats): boolean {
  return scriptBeats !== undefined && narration.beats.length < scriptBeats;
}

/**
 * The scenes a narration can show. A full narration shows every scene. A partial one (`--beats 1`)
 * leaves out the scenes whose start cue is not in it, so a one-beat test renders a one-scene clip
 * instead of failing on cues to words nobody has spoken yet.
 */
export function coveredScenes<S extends { from?: Cue }>(scenes: S[], narration: Narration, scriptBeats?: number): S[] {
  if (!isPartial(narration, scriptBeats)) return scenes;
  return scenes.filter((s, i) => i === 0 || s.from === undefined || (cueError(s.from, narration) === null && resolveCue(s.from, narration) < narration.duration));
}
