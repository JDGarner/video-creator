# Scene types

Generated from `src/scenes/schema.ts` by `pnpm docs:scenes`; do not edit by hand. These are the
items a storyboard's `## Scenes` YAML list may contain. Every scene takes the common fields; the
first scene starts at 0 and each later one needs `from`. A scene ends when the next starts.

Cues are seconds, `beat N`, `beat N end`, `end`, or a spoken word (`Diprotodon`, `every#2` for the
second time it is said), with an optional `+ 0.5` or `- 0.2`. Words are matched ignoring case and
punctuation. Images are file names listed in the video's `assets.yaml`.

## Common fields

| field | type | default | meaning |
|---|---|---|---|
| `from` | number or string |  | Scene start. Required except on the first scene, which starts at 0. A scene ends when the next one starts |
| `transition` | `cut` \| `fade` | `"cut"` | How this scene enters: a hard cut or a half-second crossfade |
| `variant` | `light` \| `dark` |  | Paper variant under the scene; the video's config.variant when absent |
| `headline` | string or { text: string, at?: number or string, until?: number or string, align?: `left` \| `center` } |  | Display serif, upper part of the frame |
| `caption` | string or { text: string, at?: number or string, until?: number or string, align?: `left` \| `center` } |  | Mono label under the headline |
| `notes` | string |  | Free text for humans, ignored |

## `still`

| field | type | default | meaning |
|---|---|---|---|
| `image` | string | required | Image file name listed in assets.yaml |
| `fit` | `cover` \| `contain` | `"cover"` |  |
| `move` | `none` \| `zoom-in` \| `zoom-out` \| `pan-left` \| `pan-right` | `"zoom-in"` | Slow camera drift over the scene |
| `treatment` | `photo` \| `illustration` \| `plain` \| `silhouette` | `"photo"` | photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink |
| `frame` | boolean | `false` | Inset the image in a double-rule frame instead of full bleed |
| `inset` | { image: string, headline?: string, caption?: string, at?: number or string } |  | A small framed card in the top right, e.g. a callback to an earlier card |

## `card`

| field | type | default | meaning |
|---|---|---|---|
| `headline` | string or { text: string, at?: number or string, until?: number or string, align?: `left` \| `center` } | required | A string, or { text, at, until, align } to time it inside the scene |
| `image` | string | required | Image file name listed in assets.yaml |
| `tone` | `surface` \| `bg` \| `land` \| `water` \| `structure` \| `structureAlt` \| `accent` | `"surface"` | Flat background colour |
| `reference` | string |  | Scale reference silhouette drawn in the same spot on every card, e.g. human.svg |
| `height` | number |  | Subject height in metres; sizes the image against a 1.75 m reference |
| `treatment` | `photo` \| `illustration` \| `plain` \| `silhouette` | `"illustration"` | photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink |

## `timeline`

| field | type | default | meaning |
|---|---|---|---|
| `range` | [number, number] | required | Axis values left to right, e.g. [70000, 30000] for years ago |
| `tick` | number | required | Tick spacing in axis units |
| `unit` | string | `""` | Axis label, e.g. "years ago" |
| `bands` | list of { from: number, to: number, label: string, tone?: `accent` \| `structure` \| `muted`, at?: number or string, note?: string } | `[]` |  |
| `silhouettes` | { images: list of string, dim?: boolean, at?: number or string } |  | A row of silhouettes above the axis, in colour or dimmed to outlines |
| `question` | number or string |  | Show a large question mark from this cue |

## `panels`

| field | type | default | meaning |
|---|---|---|---|
| `panels` | list of { image: string, label: string, at?: number or string, treatment?: `photo` \| `illustration` \| `plain` \| `silhouette` } | required |  |

## `silhouettes`

| field | type | default | meaning |
|---|---|---|---|
| `background` | string |  | Landscape behind the group, illustration treatment |
| `images` | list of string | required |  |
| `dim` | { at: number or string, keep?: integer } |  | At the cue, every silhouette but `keep` fades to a grey outline |

## `montage`

| field | type | default | meaning |
|---|---|---|---|
| `images` | list of string | required |  |
| `dim` | boolean | `false` | Grey outlines instead of full colour |
| `treatment` | `photo` \| `illustration` \| `plain` \| `silhouette` | `"illustration"` | photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink |

## `landmass`

| field | type | default | meaning |
|---|---|---|---|
| `region` | string | required | A country as Natural Earth names it, e.g. "Australia"; drawn flat in ink, centred |
| `loss` | { fraction: number, at: number or string, keep?: `east` \| `west` \| `north` \| `south`, sweepSec?: number } |  | From the cue, this share of the area sweeps to the alert colour, leaving a strip along one edge |
