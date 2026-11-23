/**
 * The shorts pipeline CLI: `pnpm check|narrate|align|render|bundle|stills|short <video> [flags]`.
 * The stages live in scripts/short/Short.ts; see docs/PIPELINE.md.
 */
import { parseArgs } from "node:util";
import { Short, type Flags } from "./short/Short";
import { PipelineError } from "./short/util";

type Stage = "check" | "narrate" | "align" | "render" | "bundle" | "stills";
const USAGE = "usage: short.ts check|narrate|align|render|bundle|stills|short <video> [--beats 1,2] [--only 3] [--seed N] [--scene N] [--full-sentences] [--out path.mp4] [--force]";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { beats: { type: "string" }, only: { type: "string" }, seed: { type: "string" }, scene: { type: "string" }, "full-sentences": { type: "boolean", default: false }, out: { type: "string" }, force: { type: "boolean", default: false } },
  });
  const [stageArg, id] = positionals;
  const single: Stage[] = ["check", "narrate", "align", "render", "bundle", "stills"];
  const stages: Stage[] = stageArg === "short" ? ["check", "narrate", "align", "render", "bundle"] : single.includes(stageArg as Stage) ? [stageArg as Stage] : [];
  if (!stages.length) throw new PipelineError(USAGE);
  if (!id) throw new PipelineError("which video? e.g. pnpm short australia-megafauna-extinction");
  const flags: Flags = { beats: values.beats, only: values.only, seed: values.seed === undefined ? undefined : Number(values.seed), scene: values.scene === undefined ? undefined : Number(values.scene), fullSentences: values["full-sentences"], out: values.out, force: values.force };
  if (flags.seed !== undefined && Number.isNaN(flags.seed)) throw new PipelineError("--seed must be an integer");
  if (flags.scene !== undefined && (!Number.isInteger(flags.scene) || flags.scene < 1)) throw new PipelineError("--scene must be a scene number, counting from 1");

  const short = new Short(id);
  for (const stage of stages) {
    if (stage === "check") short.check();
    if (stage === "narrate") short.narrate(flags);
    if (stage === "align") await short.align(flags);
    if (stage === "render") short.render(flags);
    if (stage === "stills") await short.stills(flags);
    if (stage === "bundle") short.bundle(flags, stageArg === "short");
  }
}

main().catch((e: unknown) => {
  console.error(`\n${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
