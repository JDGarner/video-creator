# Motion rules

How things move, so every scene feels like the same hand. `Reveal`, `DrawPath` and the helpers in
`src/motion/` implement these; scenes should not invent their own curves.

- Enter: a small pull-back, then a spring to rest with slight overshoot. `Reveal` does this; use it
  for everything that appears. Offsets snap to whole pixels so text never shimmers while settling.
- Exit: quicker than enter, ease-in, usually a fade with a small push the same way. Never spring on exit.
- Stagger siblings by `theme.motion.staggerMs`; start the next action before the previous has settled.
- At most three independently moving groups at once.
- Hold for `theme.motion.holdBeforeRevealMs` before the key reveal: the big number, the accent word.
- Camera moves (map pan, zoom): heavy spring or sine ease, at least two seconds, never linear.
- Numbers count up over 0.6 to 1.2 s with ease-out and land on the exact value on the last frame.
- Lines draw on with `DrawPath`, 0.8 to 2 s depending on length. An axis draws in about a second
  and a half and its ticks pop as the head passes; nothing hangs off an axis until it is complete.
- Spans and bars rise to full height out of their axis in under half a second while wiping open from
  their start value over a little more than a second; the label follows once the bar is at full
  height. Adjacent spans that tell one story open as a single run at one head speed, not as two bars
  that happen to touch. Never fade a bar in.
- A scale draws once the subject has landed, in under a second: up from the ground line for a
  height, or along as the ground line itself for a length, so there is never a second line under
  the one being drawn. Its ticks pop as the head passes and the measure is named only when the
  line reaches it.
- A panel that carries a chart unfolds from the line it belongs to, growing up and down from the axis
  in under a second, and the axis draws only once the panel is open.
- A stamp (the question mark) lands from about a third larger with a snappy spring, so it hits rather
  than appears. Stamps are for the one punctuation moment in a scene, not for every reveal.
- Pictures that sit for more than a few seconds drift by one to three percent so the frame breathes;
  neighbours drift in opposite directions.
- One-step changes are allowed when the narration says so (the landmass loss), otherwise ease.
- No linear easing except constant-velocity travel along a path, and ease the ends even then.
- Every value derives from `useCurrentFrame()`. No CSS transitions or animations.

## Sound

The video sounds like one printed thing being handled: paper, a pencil, a woodblock. Five cues,
synthesised by `pnpm sfx` into `public/sfx/` and played through the `Sfx` primitive, are the whole
palette; a short that wants a sixth sound adds it to the recipe table in `scripts/sfx.ts`, not a
file from a library.

- Cues sit on frames that come from the narration manifest and alignment like every visual: a
  scene start, a band cue, the frame a spring lands. Never a number of seconds in the storyboard.
- Levels are set once, in the catalogue, from a measured target: `soft` cues about 20 dB under the
  voice at its loudest, the one `accent` cue about 10 dB under. Nothing competes with a spoken word.
  Narration masters to -16 LUFS; the mix must still measure within half a LU of it.
- A cut enters with a page flick, a crossfade with a soft whoosh. The first scene enters in silence.
- A thing that springs in and lands on something taps as it lands (the card silhouette on its
  ground line), on the spring's landing frame, not its start.
- The stamp is the one accent cue, a thump on the frame it lands. One accent per scene at most.
- A sweep (the landmass loss) carries a dry brush for exactly as long as it moves.
- Panels that arrive on their own cue flick like a page; one that arrives with the scene leaves
  the flick to the transition, so nothing doubles.
- The closing scene gets its transition sound and nothing else; the last line lands on the voice.
- No music bed in a short. The pace is tight and a bed blurs the caption highlights.
- `config.sound: false` silences every cue; a scene's `sound: false` silences its own and its
  transition. Both exist so a cut can be checked with narration alone.
