import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ShortConfig } from "../../src/lib/config";
import { fullDescription, srt, type Publish, type SrtWord } from "../../src/lib/publish";
import { creditLines, type Asset } from "../../src/lib/story";
import type { Media, MediaInfo } from "./media";
import { fail } from "./util";

export type BundleInput = {
  id: string;
  dir: string;
  mp4: string;
  words: SrtWord[];
  publish: Publish;
  assets: Asset[];
  config: ShortConfig;
  media: Media;
};

/** What metadata.json holds: the upload form's answers plus what was measured. */
export type Metadata = {
  file: string;
  title: string;
  description: string;
  tags: string[];
  madeForKids: boolean;
  syntheticMedia: boolean;
  thumbnailSec: number | null;
  durationSec: number;
  width: number;
  height: number;
  lufs: number;
};

/** Check the mp4 against the config's publish rules. */
export function checkVideo(info: MediaInfo, config: ShortConfig): void {
  const { width, height, publish: rules } = config;
  if (info.width !== width || info.height !== height) fail(`mp4 is ${info.width}x${info.height}, config says ${width}x${height}`);
  if (!info.hasAudio) fail("mp4 has no audio stream");
  if (info.durationSec > rules.maxSec) fail(`mp4 is ${info.durationSec.toFixed(1)} s, over the ${rules.maxSec} s Shorts limit`);
}

/** The description YouTube gets: the storyboard's text, image credits, then hashtags. */
export function describe(publish: Publish, assets: Asset[]): string {
  const credits = creditLines(assets);
  return fullDescription({ description: [publish.description, credits.length ? ["Images", ...credits].join("\n") : ""].filter(Boolean).join("\n\n"), hashtags: publish.hashtags });
}

/** Write out/shorts/<video>/publish/: the mp4, captions.srt, metadata.json and an optional thumbnail. */
export function writeBundle(input: BundleInput): { metadata: Metadata; files: string[]; cues: number } {
  const { id, dir, mp4, words, publish, assets, config, media } = input;
  const info = media.probe(mp4);
  checkVideo(info, config);
  const lufs = media.loudness(mp4);

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  copyFileSync(mp4, path.join(dir, `${id}.mp4`));
  const captions = srt(words);
  writeFileSync(path.join(dir, "captions.srt"), captions);
  if (publish.thumbnailSec !== undefined) {
    if (publish.thumbnailSec >= info.durationSec) fail(`thumbnail time ${publish.thumbnailSec} s is past the end of the video`);
    media.frameAt(mp4, publish.thumbnailSec, path.join(dir, "thumbnail.png"));
  }
  const metadata: Metadata = {
    file: `${id}.mp4`,
    title: publish.title,
    description: describe(publish, assets),
    tags: publish.tags,
    madeForKids: config.publish.madeForKids,
    syntheticMedia: config.publish.syntheticMedia,
    thumbnailSec: publish.thumbnailSec ?? null,
    durationSec: info.durationSec,
    width: info.width,
    height: info.height,
    lufs,
  };
  writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
  return { metadata, files: readdirSync(dir).sort(), cues: captions.trim().split("\n\n").length };
}
