# video-creator

Programmatic explainer videos with Remotion. Read `context.md` (why, visual target) and `handoff.md` (what, how, build order) before changing anything.

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
