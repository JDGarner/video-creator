# video-creator

Programmatic explainer videos with Remotion. Read `context.md` (why, visual target), `README.md` (how a short is made, layout, status) and `docs/MOTION.md` (how things move) before changing anything. Anything under `voice/` follows `voice/CLAUDE.md` instead.

## Hard rules

- Every visual value derives from `useCurrentFrame()`. No CSS transitions or animations.
- Colours and fonts come from `useTheme()` / `useColor()`. No hex literals outside `src/theme/themes/`. `pnpm lint:theme` enforces it.
- Scenes take data, not instructions. Adding a scene = component + Zod schema + registry entry + docs regen.
- Seeded randomness only. Assets via `staticFile()`. `Img`/`Video`/`Audio` from Remotion, never native tags.
- A theme's `light`/`dark` variant is about which colour slot is used, not about brightness. Decide darkening or lightening with `isDark(bg)`.
- Fonts load per theme from `ThemeProvider`; a new face goes in `src/theme/fonts.ts` and a theme file, nowhere else.
- The look is our own: never reproduce the reference channel's wordmark, name or exact palette values.

## Commands

```
pnpm dev            # Remotion studio
pnpm still <id> out/<id>.png
pnpm typecheck
pnpm test           # lib helpers, scene layout bands, pipeline stages against a fixture short
pnpm lint:theme
pnpm short <video>      # check -> narrate -> align -> render -> bundle, skipping unchanged stages
pnpm check|narrate|align|render|bundle|stills <video> [--beats 1,2] [--only 3] [--seed N] [--scene N] [--force]
pnpm asset <video> phylopic:<taxon> | <commons url> [--as f] | --search "words"   # images + licence bookkeeping
pnpm docs:scenes        # regenerate docs/SCENES.md after changing src/scenes/schema.ts
```

The shorts pipeline is described in `docs/PIPELINE.md`; read it before changing `scripts/short/`, `src/shorts/`, `src/scenes/` or anything under `voice/`. Shorts are data: a storyboard's `## Scenes` YAML is rendered by the scene types in `src/scenes/` (documented in `docs/SCENES.md`). Adding a scene type = schema + component + registry case + `pnpm docs:scenes`. There are no hand-written compositions: a short that needs something new gets a scene type.

Node 22 via nvm (`.nvmrc`). Remotion packages and zod are pinned exactly; Remotion 4.0.541 requires zod 4.6.7.

## Where things live

- `src/theme/` tokens, themes (`atlas`, `midnight`), fonts, provider
- `src/primitives/` style-aware, content-agnostic building blocks
- `src/dev/` visual checks and spikes only, nothing here ships (`sheet-<theme>-<variant>`, `captions-check`, map spikes)
- `src/lib/` pure helpers with Vitest tests next to them
- `docs/design/` chosen reference renders and why; `spikes/` rejected explorations kept for reference
- `stories/shorts/<video>/` a short's storyboard (`## Narration` is the script, `## Scenes` the visuals as YAML, `## Publish` the YouTube metadata), `assets.yaml` + `assets/` for its images, `video.json` overrides
- `src/scenes/` scene types: `schema.ts` (Zod, one per type), a component per type, `index.tsx` picks one
- `src/shorts/` `DataShort` renders any storyboard; `index.tsx` registers a `short-<video>` composition for each entry in `videos.json` (written by `pnpm check`)
- `config/defaults.json` pipeline defaults, documented in `docs/PIPELINE.md`
- `voice/` narration pipeline, see below

## Voice

Narration is my own voice, cloned locally with Chatterbox and run on CPU. `voice/` is a separate
`uv` Python project; never mix it with the Node toolchain. Workflow: record takes with
`voice/scripts/record.sh`, cut candidates with `prepare_ref.py`, compare with `clone_test.py`, then
`--pick` one as `voice/reference/reference.wav`, the only tracked voice file. Raw takes, clips and
generated audio are gitignored. `scripts/short/Short.ts` drives `narrate.py` and `align.ts` and publishes
their outputs to `public/shorts/<video>/`, which is all the compositions read. Status and
decisions are in `voice/PLAN.md`; the flow is in `docs/PIPELINE.md`.
