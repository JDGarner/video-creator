/** The `## Publish` section of a storyboard and the subtitle file for the upload bundle. */

export type Publish = {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  /** frame to pick as the thumbnail in the mobile app; Shorts take no uploaded image */
  thumbnailSec?: number;
};

const FIELDS = new Set(["title", "tags", "hashtags", "thumbnail"]);

// YouTube limits
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 5000;
export const TAGS_MAX = 500;

function section(markdown: string, heading: string): string | null {
  const m = markdown.match(new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  return m ? m[1]!.trim() : null;
}

/** "0:09", "9" or "9.5" in seconds. */
export function parseTime(s: string): number {
  const parts = s.split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p) || p < 0)) throw new Error(`bad time: ${s}`);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/**
 * Parse the `## Publish` section: `key: value` lines first, then a blank line, then the
 * description as free text. Returns null when the storyboard has no such section.
 */
export function parsePublish(markdown: string): Publish | null {
  const body = section(markdown, "Publish");
  if (body === null) return null;
  const lines = body.split("\n");
  const fields: Record<string, string> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "") break;
    const m = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!m) throw new Error(`Publish: expected "key: value" before the description, got "${line}"`);
    const key = m[1]!.toLowerCase();
    if (!FIELDS.has(key)) throw new Error(`Publish: unknown field "${key}" (known: ${[...FIELDS].join(", ")})`);
    fields[key] = m[2]!.trim();
  }
  const description = lines.slice(i).join("\n").trim();
  const title = fields.title ?? "";
  if (!title) throw new Error("Publish: title is required");
  if (title.length > TITLE_MAX) throw new Error(`Publish: title is ${title.length} chars, max ${TITLE_MAX}`);
  if (/[<>]/.test(title)) throw new Error("Publish: title may not contain < or >");
  const tags = (fields.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const tagChars = tags.join(",").length;
  if (tagChars > TAGS_MAX) throw new Error(`Publish: tags total ${tagChars} chars, max ${TAGS_MAX}`);
  const hashtags = (fields.hashtags ?? "").split(/\s+/).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`));
  const full = fullDescription({ description, hashtags });
  if (full.length > DESCRIPTION_MAX) throw new Error(`Publish: description is ${full.length} chars, max ${DESCRIPTION_MAX}`);
  return { title, description, tags, hashtags, ...(fields.thumbnail ? { thumbnailSec: parseTime(fields.thumbnail) } : {}) };
}

/** Description as pasted into YouTube: the text, then the hashtags on their own line. */
export function fullDescription(p: Pick<Publish, "description" | "hashtags">): string {
  return [p.description, p.hashtags.join(" ")].filter(Boolean).join("\n\n");
}

export type SrtWord = { text: string; start: number; end: number; beat?: number };

const CUE_MAX_CHARS = 60;
const CUE_GAP_S = 0.7;
const CUE_HOLD_S = 0.3;

/**
 * Words to subtitle cues: a cue ends at a sentence end, a beat change, a pause longer than
 * CUE_GAP_S or when it would pass CUE_MAX_CHARS. Cues hold briefly but never overlap the next.
 */
export function srt(words: SrtWord[]): string {
  const cues: SrtWord[][] = [];
  let cur: SrtWord[] = [];
  const flush = () => {
    if (cur.length) cues.push(cur);
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (prev && cur.length) {
      const len = cur.map((c) => c.text).join(" ").length + 1 + w.text.length;
      if (/[.?!]$/.test(prev.text) || prev.beat !== w.beat || w.start - prev.end > CUE_GAP_S || len > CUE_MAX_CHARS) flush();
    }
    cur.push(w);
  });
  flush();
  return cues
    .map((cue, i) => {
      const start = cue[0]!.start;
      const lastEnd = cue[cue.length - 1]!.end;
      const nextStart = cues[i + 1]?.[0]?.start ?? Infinity;
      const end = Math.min(lastEnd + CUE_HOLD_S, nextStart);
      return `${i + 1}\n${stamp(start)} --> ${stamp(end)}\n${cue.map((w) => w.text).join(" ")}\n`;
    })
    .join("\n");
}

function stamp(sec: number): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}
