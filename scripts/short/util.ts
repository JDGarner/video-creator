import { spawnSync } from "node:child_process";
import type { Finding } from "../../src/lib/story";

/** A stage refusing to continue. The CLI prints the message and exits 1; tests catch it. */
export class PipelineError extends Error {}

export function fail(msg: string): never {
  throw new PipelineError(msg);
}

/** Run a command with inherited stdio; fail on a non-zero exit. */
export function run(cmd: string, args: string[], cwd: string): void {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) fail(`${cmd} ${args[0] ?? ""} failed`);
}

/** Print findings, then fail when any is an error. */
export function report(findings: Finding[], log: (s: string) => void): void {
  for (const f of findings) log(`${f.level === "error" ? "ERROR" : "warning"}: ${f.message}`);
  if (findings.some((f) => f.level === "error")) fail("fix the storyboard and run again");
}
