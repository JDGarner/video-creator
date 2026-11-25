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
| `treatment` | `photo` \| `illustration` \| `plain` \| `silhouette` \| `print` | `"photo"` | photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink. print: the white ground knocked out, so the drawing sits straight on the paper |
| `frame` | boolean | `false` | Inset the image in a double-rule frame instead of full bleed |
| `inset` | { image: string, headline?: string, caption?: string, at?: number or string } |  | A small framed card in the top right, e.g. a callback to an earlier card |

## `card`

| field | type | default | meaning |
|---|---|---|---|
| `headline` | string or { text: string, at?: number or string, until?: number or string, align?: `left` \| `center` } | required | A string, or { text, at, until, align } to time it inside the scene |
| `image` | string | required | Image file name listed in assets.yaml |
| `picture` | string |  | Illustration or photograph fitted inside the plate above the text; a labelled placeholder until the file is in assets/ |
| `pictureTreatment` | `photo` \| `illustration` \| `plain` \| `silhouette` \| `print` | `"print"` | photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink. print: the white ground knocked out, so the drawing sits straight on the paper |
| `tone` | `surface` \| `bg` \| `land` \| `water` \| `structure` \| `structureAlt` \| `accent` | `"surface"` | Flat background colour |
| `reference` | string |  | Scale reference silhouette drawn in the same spot on every card, e.g. human.svg |
| `height` | number |  | Subject height in metres; sizes the image against a 1.75 m reference and draws a metre scale beside it |
| `treatment` | `photo` \| `illustration` \| `plain` \| `silhouette` \| `print` | `"illustration"` | photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink. print: the white ground knocked out, so the drawing sits straight on the paper |

## `timeline`

| field | type | default | meaning |
|---|---|---|---|
| `range` | [number, number] | required | Axis values left to right, e.g. [70000, 30000] for years ago |
| `tick` | number | required | Tick spacing in axis units |
| `unit` | string | `""` | Axis label, e.g. "years ago" |
| `bands` | list of { from: number, to: number, label: string, tone?: `accent` \| `structure` \| `muted`, at?: number or string, note?: string } | `[]` |  |
| `silhouettes` | { images: list of string, dim?: boolean, at?: number or string } |  | A row of silhouettes above the axis, in colour or dimmed to outlines |
| `pictures` | list of string |  | Pictures in a two-column grid filling the frame, revealed one after another from the scene start; the axis then appears over them on a surface panel, and they dim when the question mark shows |
| `text` | `normal` \| `large` | `"normal"` | large makes every label on the axis about 1.6 times bigger, for a timeline with few ticks |
| `labels` | `above` \| `inside` | `"above"` | Where a band's label sits: above its left end, or centred inside the band, which is then tall enough for two lines and wraps |
| `chain` | boolean | `false` | Open the bands as one continuous run in the order listed, each starting where the previous finished; the run starts at the first band's cue and later cues are ignored |
| `question` | number or string |  | Show a large question mark from this cue |

## `panels`

| field | type | default | meaning |
|---|---|---|---|
| `panels` | list of { image: string, label: string, at?: number or string, treatment?: `photo` \| `illustration` \| `plain` \| `silhouette` \| `print` } | required |  |

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
| `treatment` | `photo` \| `illustration` \| `plain` \| `silhouette` \| `print` | `"illustration"` | photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink. print: the white ground knocked out, so the drawing sits straight on the paper |

## `landmass`

| field | type | default | meaning |
|---|---|---|---|
| `region` | string | required | A country as Natural Earth names it, e.g. "Australia", drawn centred |
| `style` | `ink` \| `atlas` | `"ink"` | ink: a flat silhouette in the theme ink. atlas: the hypsometric relief map cut to the coastline |
| `loss` | { fraction: number, at: number or string, keep?: `east` \| `west` \| `north` \| `south`, sweepSec?: number } |  | From the cue, this share of the area sweeps to the alert colour, leaving a strip along one edge |
