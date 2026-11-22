import path from "node:path";
import type { AlignResult } from "../../voice/scripts/align";
import { ffmpegMedia, type Media } from "./media";
import { run } from "./util";

/** Everything a stage reaches outside this process. The CLI uses the real ones; tests pass fakes. */
export type Tools = {
  /** `uv run scripts/narrate.py <args>` in voice/; writes narration.wav and manifest.json to the --out dir. */
  narrate(args: string[], voiceDir: string): void;
  /** whisper.cpp alignment of <dir>/narration.wav; writes <dir>/alignment.json. */
  align(dir: string): Promise<AlignResult>;
  /** `remotion render` of a composition, optionally a frame range [first, last] and input props. */
  render(compositionId: string, out: string, frames: [number, number] | undefined, root: string, props?: object): void;
  media: Media;
};

export const realTools: Tools = {
  narrate: (args, voiceDir) => run("uv", ["run", "scripts/narrate.py", ...args], voiceDir),
  align: async (dir) => (await import("../../voice/scripts/align")).alignNarration(dir),
  render: (id, out, frames, root, props) =>
    run("pnpm", ["exec", "remotion", "render", id, out, ...(frames ? [`--frames=${frames[0]}-${frames[1]}`] : []), ...(props ? [`--props=${JSON.stringify(props)}`] : []), "--log=error"], path.resolve(root)),
  media: ffmpegMedia,
};
