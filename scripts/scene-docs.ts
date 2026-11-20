/** Writes docs/SCENES.md from the scene schemas: `pnpm docs:scenes`. */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { SceneSchema } from "../src/scenes/schema";

const REPO = path.resolve(import.meta.dirname, "..");

function typeOf(schema: z.ZodType): string {
  const js = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  const render = (j: Record<string, unknown>): string => {
    if (j.enum) return (j.enum as unknown[]).map((v) => `\`${v}\``).join(" \\| ");
    if (j.const !== undefined) return `\`${j.const}\``;
    if (j.anyOf) return (j.anyOf as Record<string, unknown>[]).map(render).join(" or ");
    if (Array.isArray(j.type)) return (j.type as string[]).join(" or ");
    if (j.type === "array") {
      const items = j.items as Record<string, unknown> | undefined;
      return j.prefixItems ? `[${(j.prefixItems as Record<string, unknown>[]).map(render).join(", ")}]` : `list of ${items ? render(items) : "any"}`;
    }
    if (j.type === "object") {
      const props = (j.properties ?? {}) as Record<string, Record<string, unknown>>;
      const req = new Set((j.required as string[] | undefined) ?? []);
      return `{ ${Object.entries(props)
        .map(([k, v]) => `${k}${req.has(k) ? "" : "?"}: ${render(v)}`)
        .join(", ")} }`;
    }
    return String(j.type ?? "any");
  };
  return render(js);
}

const lines: string[] = [
  "# Scene types",
  "",
  "Generated from `src/scenes/schema.ts` by `pnpm docs:scenes`; do not edit by hand. These are the",
  "items a storyboard's `## Scenes` YAML list may contain. Every scene takes the common fields; the",
  "first scene starts at 0 and each later one needs `from`. A scene ends when the next starts.",
  "",
  "Cues are seconds, `beat N`, `beat N end`, `end`, or a spoken word (`Diprotodon`, `every#2` for the",
  "second time it is said), with an optional `+ 0.5` or `- 0.2`. Words are matched ignoring case and",
  "punctuation. Images are file names listed in the video's `assets.yaml`.",
  "",
];

const common = new Set(["from", "transition", "variant", "headline", "caption", "notes"]);
const first = SceneSchema.options[0]!;
lines.push("## Common fields", "", "| field | type | default | meaning |", "|---|---|---|---|");
for (const key of common) {
  const f = first.shape[key as keyof typeof first.shape] as z.ZodType;
  lines.push(row(key, f));
}
lines.push("");

for (const option of SceneSchema.options) {
  const type = (option.shape.type as z.ZodLiteral<string>).value;
  lines.push(`## \`${type}\``, "", "| field | type | default | meaning |", "|---|---|---|---|");
  for (const [key, f] of Object.entries(option.shape)) {
    if (key === "type") continue;
    // common fields are documented once above, unless the type makes one required (card's headline)
    if (common.has(key) && (f instanceof z.ZodOptional || f instanceof z.ZodDefault)) continue;
    lines.push(row(key, f as z.ZodType));
  }
  lines.push("");
}

function row(key: string, f: z.ZodType): string {
  let inner: z.ZodType = f;
  let dflt = "";
  let optional = false;
  for (;;) {
    if (inner instanceof z.ZodDefault) {
      dflt = JSON.stringify(inner.def.defaultValue);
      inner = inner.def.innerType as z.ZodType;
    } else if (inner instanceof z.ZodOptional) {
      optional = true;
      inner = inner.def.innerType as z.ZodType;
    } else break;
  }
  const desc = f.description ?? inner.description ?? "";
  const required = !optional && !dflt;
  return `| \`${key}\` | ${typeOf(inner)} | ${dflt ? `\`${dflt}\`` : required ? "required" : ""} | ${desc.replace(/\|/g, "\\|")} |`;
}

writeFileSync(path.join(REPO, "docs", "SCENES.md"), lines.join("\n"));
console.log("docs/SCENES.md written");
