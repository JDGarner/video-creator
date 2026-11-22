import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Short content hash of some strings and buffers. */
export function sha(parts: (string | Buffer)[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 16);
}

export function fileSha(p: string): string {
  return sha([readFileSync(p)]);
}

/** Hash of every file under a directory, names and contents, in a stable order. */
export function treeSha(dir: string): string {
  if (!existsSync(dir)) return sha(["none"]);
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(dir);
  files.sort();
  return sha(files.flatMap((f) => [path.relative(dir, f), readFileSync(f)]));
}
