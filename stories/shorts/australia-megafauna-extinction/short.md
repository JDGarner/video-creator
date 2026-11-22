# Short: Australian Megafauna Extinction

**Deliverable:** Voice-over-led explainer, YouTube Short
**Target runtime:** 55–60 seconds
**Format:** Combination of stock footage, maps and overlays

## The idea in one line

Australia lost nearly all of its giant animals around 45,000 years ago, shortly after humans arrived, and while climate may have played a part, people are now seen as the likely main cause.

## Narration

1. Around eighty five to ninety percent of Australia's megafauna went extinct before Europeans arrived.
2. These include Diprotodon, a three tonne wombat relative. Procoptodon, a giant kangaroo standing over two metres tall. Megalania, an enormous monitor lizard. And Genyornis, a two hundred kilogram flightless bird.
3. Most disappeared roughly fifty thousand to forty thousand years ago, after humans had arrived, though how long after is debated. So what caused it?
4. There are three main explanations. Human hunting, changes to the landscape caused by fire, and climate change.
5. Burnt eggshell fragments suggest humans collected and cooked the eggs of giant flightless birds, potentially reducing their breeding success.
6. Climate change may also have contributed, but many of these animals had survived earlier climate fluctuations.
7. Today, many researchers consider human activity a major driver, although the exact causes are still debated.

## Visuals and animation

Style notes: still images and illustrations only. Transitions are cuts or 0.5 s crossfades. Text overlays fade in, hold, fade out. One font, two sizes (headline / caption).

#### 0:00–0:10 | "Around 85–90%…" — the scale of loss
- Open on a wide illustrated Pleistocene landscape with six or seven
  megafauna silhouettes grouped as if grazing.
- At "85–90%", every silhouette but one fades to grey outline in a
  single step.
- Headline: 85–90% OF MEGAFAUNA LOST
- Caption: "Animals over 44 kg · every land species over 100 kg"

#### 0:10–0:22 | The four animals
Four cards, cut on each name as it is spoken (~3 s each). Each:
species illustration beside a human silhouette, flat colour
background, name as headline, description as caption. Keep the human
silhouette in the same spot on every card.
- DIPROTODON — "Wombat relative · ~3 tonnes"
- PROCOPTODON — "Giant kangaroo · over 2 m tall"
- MEGALANIA — "Monitor lizard · 5 m+ long"
- GENYORNIS — "Flightless bird · ~200 kg"

#### 0:22–0:30 | Timing
- Cut to a horizontal timeline, 70,000 → 30,000 years ago, ticks
  every 10,000.
- Shaded band "Humans arrive" spanning ~65,000–50,000.
- Darker band "Most megafauna gone" spanning 50,000–40,000.
- Caption under the human band: "exact date debated"
- Optional small outline map of Sahul in a corner.

#### 0:30–0:32 | "So what caused it?"
- Timeline stays; the four animal silhouettes fade in along the top
  as grey outlines. Question mark overlay, centred.

#### 0:32–0:40 | Three explanations
- Three equal vertical panels, revealed left to right on each word.
  1. HUNTING — illustration of spear and tracks beside a Procoptodon
  2. FIRE — photograph of burnt eucalypt woodland
  3. CLIMATE — photograph of a dry salt lake bed (e.g. Lake Eyre)
- Single-word label at the top of each panel.

#### 0:40–0:48 | Eggshell evidence
- Crossfade to an illustration of a Genyornis nest with eggs.
- Cut to a close-up photograph of burnt eggshell fragments.
- Caption: "Burnt Genyornis eggshell · first reported 2016,
  confirmed 2022"
- Small inset: the Genyornis card from 0:10.

#### 0:48–0:54 | Climate caveat
- Return to the timeline, extended left to 150,000 years ago.
- Two or three earlier shaded "dry period" bands before the human band; the four animal silhouettes sit above them in full colour.
- Caption: "Megafauna survived earlier climate swings"

#### 0:54–1:00 | Conclusion
- Slow crossfade montage of the four animal cards, now in grey outline.
- Headline: HUMANS: A MAJOR DRIVER
- Caption fades in last: "Exact causes still debated"
- Hold 2 s on black before end.


## Scenes

The data the renderer uses. Each item is one scene; `from` is a spoken word or a beat, and a
scene ends when the next begins. Field reference: `docs/SCENES.md`. Images are listed in
`assets.yaml`; any not yet in `assets/` render as labelled placeholders.

```yaml
- type: landmass
  region: Australia
  style: atlas
  loss: { fraction: 0.875, at: percent, keep: east }
  headline: { text: 85 to 90 percent of megafauna lost, at: percent }
  caption: { text: Animals over 44 kg, at: percent + 0.6 }

- type: card
  from: Diprotodon
  image: diprotodon.svg
  reference: human.svg
  height: 1.8
  treatment: silhouette
  headline: DIPROTODON
  caption: Wombat relative · about 3 tonnes

- type: card
  from: Procoptodon
  image: procoptodon.svg
  reference: human.svg
  height: 2.3
  treatment: silhouette
  headline: PROCOPTODON
  caption: Giant kangaroo · over 2 m tall

- type: card
  from: Megalania
  image: megalania.svg
  reference: human.svg
  height: 1.2
  treatment: silhouette
  headline: MEGALANIA
  caption: Monitor lizard · 5 m and more, nose to tail

- type: card
  from: Genyornis
  image: genyornis.svg
  reference: human.svg
  height: 2.0
  treatment: silhouette
  headline: GENYORNIS
  caption: Flightless bird · about 200 kg

- type: timeline
  from: beat 3
  transition: fade
  range: [70000, 30000]
  tick: 10000
  unit: years ago
  bands:
    - { from: 65000, to: 50000, label: Humans arrive, tone: structure, at: beat 3 + 0.3, note: exact date debated }
    - { from: 50000, to: 40000, label: Most megafauna gone, tone: accent, at: fifty }
  silhouettes: { images: [diprotodon.svg, procoptodon.svg, megalania.svg, genyornis.svg], dim: true, at: So }
  question: caused

- type: panels
  from: beat 4
  panels:
    - { image: human.svg, label: Hunting, at: hunting, treatment: silhouette }
    - { image: burnt-woodland.jpg, label: Fire, at: fire }
    - { image: salt-lake.jpg, label: Climate, at: climate }

- type: card
  from: beat 5
  transition: fade
  image: genyornis.svg
  treatment: silhouette
  height: 2.0
  headline: GENYORNIS EGGS
  caption: Burnt shell found where people camped

- type: still
  from: cooked
  image: burnt-eggshell.jpg
  frame: true
  move: pan-left
  caption: Burnt Genyornis eggshell · first reported 2016, confirmed 2022
  inset: { image: genyornis.svg, headline: Genyornis, at: cooked + 0.5 }

- type: timeline
  from: beat 6
  transition: fade
  range: [150000, 30000]
  tick: 20000
  unit: years ago
  bands:
    - { from: 130000, to: 115000, label: Dry period, tone: muted }
    - { from: 95000, to: 85000, label: Dry period, tone: muted }
    - { from: 65000, to: 50000, label: Humans arrive, tone: structure }
    - { from: 50000, to: 40000, label: Most megafauna gone, tone: accent }
  silhouettes: { images: [diprotodon.svg, procoptodon.svg, megalania.svg, genyornis.svg] }
  caption: { text: Megafauna survived earlier climate swings, at: survived }

- type: montage
  from: beat 7
  transition: fade
  images: [diprotodon.svg, procoptodon.svg, megalania.svg, genyornis.svg]
  dim: true
  treatment: silhouette
  headline: { text: "HUMANS: A MAJOR DRIVER", at: beat 7 + 0.4 }
  caption: { text: Exact causes still debated, at: debated - 0.3 }
```

## Publish

title: Nearly all of Australia's giant animals were gone BEFORE Europeans arrived
tags: history, australia, megafauna, extinction, diprotodon, ice age

Australia lost almost all of its giant animals around forty five thousand years ago, not long after people arrived. Hunting, fire and climate have all been blamed; most researchers now put people at the centre of it.

Sources in the pinned comment.

## Sources

- Saltré et al. 2016, Nature Communications — most reliable extinction dates for 16 megafauna groups; no correlation with climate. Summary by the authors: https://theconversation.com/new-analysis-finds-no-evidence-that-climate-wiped-out-australias-megafauna-53821
- van der Kaars et al. 2017, Nature Communications — southwest Australia sediment core, extinction 45,000–43,100 years ago, “imperceptible overkill”: https://link.springer.com/article/10.1038/ncomms14142 (Monash summary: https://monash.edu/news/articles/humans-caused-australias-megafaunal-extinction)
- Saltré et al. 2019, Nature Communications — humans plus freshwater loss in southeast Australia: https://www.sci.news/paleontology/humans-climate-change-australian-megafauna-extinction-07861.html
- Wroe et al. 2013, PNAS — the climate-first counterargument, reported here: https://www.iol.co.za/news/climate-change-killed-megafauna-study-1511418

## Production notes


