import React, { createContext, useContext } from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { SFX, sfxFile, type SfxName } from "../lib/sfx";

const SoundCtx = createContext(true);

/** Whether cues below play: `config.sound` and the scene's own `sound` flag, set by the composition. */
export const SoundProvider = SoundCtx.Provider;

type Props = {
  name: SfxName;
  /** Frame to start on, in the frames of the enclosing Sequence. */
  at: number;
  /** Stretch or squeeze the cue to last this many seconds, e.g. a sweep that must match a sweep. */
  fitSec?: number;
};

/**
 * One sound cue from the palette in public/sfx/, at the catalogue's gain. Cues are placed on frames
 * that come from the narration like every visual, never from seconds in the storyboard.
 */
export const Sfx: React.FC<Props> = ({ name, at, fitSec }) => {
  const { fps } = useVideoConfig();
  const on = useContext(SoundCtx);
  if (!on || at < 0) return null;
  const { sec, gain } = SFX[name];
  const rate = fitSec === undefined ? 1 : Math.min(2, Math.max(0.5, sec / fitSec));
  const frames = Math.max(1, Math.ceil((sec / rate) * fps));
  return (
    <Sequence from={at} durationInFrames={frames} layout="none">
      <Audio src={staticFile(sfxFile(name))} volume={gain} playbackRate={rate} />
    </Sequence>
  );
};
