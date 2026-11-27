/**
 * Trim the empty margin off an asset: `pnpm trim <video> <file> [<file>...] [--fuzz 8]`.
 *
 * A picture that stands as a scale subject is sized by its box, so padding around the drawing
 * makes it read shorter than its stated height. ImageMagick trims to the content, treating
 * anything within `--fuzz` percent of the corner colour as margin. The first run keeps the
 * untouched file beside it as `<name>.orig.<ext>` (gitignored); later runs trim from that, so a
 * different fuzz can be tried and nothing is lost. Run `pnpm check <video>` afterwards: the
 * composition reads the published copy, not this file.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const REPO = path.resolve(import.meta.dirname, "..");
const USAGE = "usage: pnpm trim <video> <file> [<file>...] [--fuzz 8]";

function magick(args: string[]): string {
  const r = spawnSync("magick", args, { encoding: "utf8" });
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("ImageMagick is not installed: brew install imagemagick");
  if (r.status !== 0) throw new Error(`magick failed: ${r.stderr.trim()}`);
  return r.stdout.trim();
}

const size = (file: string) => magick(["identify", "-format", "%wx%h", file]);

function main(): void {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { fuzz: { type: "string", default: "8" } } });
  const [video, ...files] = positionals;
  if (!video || !files.length) throw new Error(USAGE);
  const fuzz = Number(values.fuzz);
  if (!Number.isFinite(fuzz) || fuzz < 0 || fuzz > 100) throw new Error("--fuzz is a percentage, 0 to 100");
  const dir = path.join(REPO, "stories", "shorts", video, "assets");
  for (const file of files) {
    const target = path.join(dir, file);
    if (!existsSync(target)) throw new Error(`no such asset: ${path.relative(REPO, target)}`);
    const ext = path.extname(file);
    const orig = path.join(dir, `${path.basename(file, ext)}.orig${ext}`);
    if (!existsSync(orig)) copyFileSync(target, orig);
    const before = size(orig);
    // a JPEG is re-encoded by any edit, so keep it near lossless
    const quality = /\.jpe?g$/i.test(ext) ? ["-quality", "95"] : [];
    magick([orig, "-fuzz", `${fuzz}%`, "-trim", "+repage", ...quality, target]);
    console.log(`${file.padEnd(28)} ${before.padEnd(11)} -> ${size(target)}  (fuzz ${fuzz}%, original kept as ${path.basename(orig)})`);
  }
  console.log(`\nnow: pnpm check ${video}`);
}

try {
  main();
} catch (e: unknown) {
  console.error(`\n${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
