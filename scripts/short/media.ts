import { spawnSync } from "node:child_process";
import { fail, run } from "./util";

export type MediaInfo = { durationSec: number; width: number; height: number; hasAudio: boolean };

/** The ffmpeg-backed operations a stage needs; tests substitute fakes. */
export type Media = {
  probe(file: string): MediaInfo;
  /** Integrated loudness in LUFS. */
  loudness(file: string): number;
  /** Copy an image, scaling it down to at most `maxWidth` wide. */
  scaleRaster(src: string, dst: string, maxWidth: number): void;
  /** Write the frame at `sec` of a video as a PNG. */
  frameAt(video: string, sec: number, out: string): void;
};

export const ffmpegMedia: Media = {
  probe(file) {
    const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-show_entries", "format=duration", "-of", "json", file], { encoding: "utf8" });
    if (r.status !== 0) fail(`ffprobe failed on ${file}`);
    const j = JSON.parse(r.stdout) as { streams: { codec_type: string; width?: number; height?: number }[]; format: { duration: string } };
    const video = j.streams.find((s) => s.codec_type === "video");
    if (!video) fail(`${file} has no video stream`);
    return { durationSec: parseFloat(j.format.duration), width: video.width ?? 0, height: video.height ?? 0, hasAudio: j.streams.some((s) => s.codec_type === "audio") };
  },
  loudness(file) {
    // loudnorm's measurement pass prints the integrated loudness as input_i
    const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8" });
    const m = r.stderr.match(/"input_i"\s*:\s*"(-?[\d.]+)"/);
    if (!m) fail("could not measure loudness with ffmpeg");
    return parseFloat(m[1]!);
  },
  scaleRaster(src, dst, maxWidth) {
    run("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `scale='min(${maxWidth},iw)':-2`, dst], process.cwd());
  },
  frameAt(video, sec, out) {
    run("ffmpeg", ["-v", "error", "-y", "-ss", String(sec), "-i", video, "-frames:v", "1", out], process.cwd());
  },
};
