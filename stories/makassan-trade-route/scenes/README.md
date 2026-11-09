# Scenes

One folder per storyboard scene. `direction.md` is the visuals, voice-over and production notes lifted
verbatim from the storyboard; `still.png` is the current design still, where one exists.

Render a still into its folder:

```
pnpm still makassan-s1 stories/makassan-trade-route/scenes/1/still.png --frame=599
pnpm exec remotion render makassan-s1 stories/makassan-trade-route/scenes/1/preview.mp4
pnpm still makassan-s2 stories/makassan-trade-route/scenes/2/still.png
```

| Scene | Composition | Status |
|---|---|---|
| 1 Before Australia was colonised | `makassan-s1` | 20 s animated preview + still, hypsometric map |
| 2 The commodity connecting three worlds | `makassan-s2` | still, fieldguide slide |
| 3–12 | not started | narration only |
