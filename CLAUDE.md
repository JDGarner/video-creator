# video-creator

Programmatic explainer videos with Remotion. Read `context.md` (why, visual target) and `handoff.md` (what, how, build order) before changing anything. Anything under `voice/` follows `voice/CLAUDE.md` instead.

## Hard rules

- Every visual value derives from `useCurrentFrame()`. No CSS transitions or animations.
- Colours and fonts come from `useTheme()` / `useColor()`. No hex literals outside `src/theme/themes/`. `pnpm lint:theme` enforces it.
- Scenes take data, not instructions. Adding a scene = component + Zod schema + registry entry + docs regen.
- Seeded randomness only. Assets via `staticFile()`. `Img`/`Video`/`Audio` from Remotion, never native tags.
- A theme's `light`/`dark` variant is about which colour slot is used, not about brightness. Decide darkening or lightening with `isDark(bg)`.

## Commands

```
pnpm dev            # Remotion studio
pnpm still <id> out/<id>.png
pnpm typecheck
pnpm test
pnpm lint:theme
```

Node 22 via nvm (`.nvmrc`). Remotion packages and zod are pinned exactly; Remotion 4.0.541 requires zod 4.6.7.

## Where things live

- `src/theme/` tokens, themes (`atlas`, `midnight`), fonts, provider
- `src/primitives/` style-aware, content-agnostic building blocks
- `src/dev/` showcase compositions used as visual checks (`sheet-<theme>-<variant>`)
- `src/lib/` pure helpers with Vitest tests next to them
- `docs/design/` chosen reference renders and why; `spikes/` rejected explorations kept for reference
- `stories/<video>/` storyboard plus `scenes/<n>/direction.md` (visuals, narration, production notes) and rendered stills
- `voice/` narration pipeline, see below

## Voice

Narration is my own voice, cloned locally with Chatterbox and run on CPU. `voice/` is a separate
`uv` Python project; never mix it with the Node toolchain. Workflow: record takes with
`voice/scripts/record.sh`, cut candidates with `prepare_ref.py`, compare with `clone_test.py`, then
`--pick` one as `voice/reference/reference.wav`, the only tracked voice file. Raw takes, clips and
generated audio are gitignored. The Remotion side consumes only `voice/out/<video>/narration.wav`
and `alignment.json`. Status and decisions are in `voice/PLAN.md`.
