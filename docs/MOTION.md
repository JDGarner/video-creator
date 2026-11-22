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
- Lines draw on with `DrawPath`, 0.8 to 2 s depending on length.
- One-step changes are allowed when the narration says so (the landmass loss), otherwise ease.
- No linear easing except constant-velocity travel along a path, and ease the ends even then.
- Every value derives from `useCurrentFrame()`. No CSS transitions or animations.
