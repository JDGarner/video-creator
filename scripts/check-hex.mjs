// Fails if a hex colour literal appears anywhere in src/ outside src/theme/themes/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../src", import.meta.url).pathname;
const allowed = join(root, "theme", "themes");
const hex = /#[0-9a-fA-F]{3,8}\b/g;
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) && !p.startsWith(allowed)) {
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        if (hex.test(line)) offenders.push(`${relative(process.cwd(), p)}:${i + 1}: ${line.trim()}`);
        hex.lastIndex = 0;
      });
    }
  }
}

walk(root);
if (offenders.length) {
  console.error("Hex colour literals outside src/theme/themes/:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("lint:theme ok, no hex literals outside themes");
