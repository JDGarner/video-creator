# Short: Why Twin-Engine Jets Cross Oceans

<!--
Example storyboard for stories/shorts/<video>/short.md. Copy this file, keep the headings.

What the pipeline reads:
  - "## Narration": the numbered list. Each item is one beat and is synthesised as one audio
    file. The text is spoken and captioned exactly as written, so write spoken English: numbers
    as words where you want them read that way, no markdown links, no footnote marks.
    Pronunciation fixes go in voice/lexicon.json, never in this text.
  - "## Scenes": a YAML list of what is on screen. One item per scene, each starting at a spoken
    word or a beat ("from") and ending when the next begins. Types and fields: docs/SCENES.md.
    Images are file names from assets.yaml; a file not yet in assets/ renders as a placeholder.
  - "## Publish": what goes into YouTube. "key: value" lines first (title is required; tags,
    hashtags and thumbnail are optional), then a blank line, then the description as free text.
    Hashtags are appended to the description. thumbnail is a time in the video; Shorts take no
    uploaded image, the mobile app only lets you pick a frame. Without this section `pnpm short`
    skips the bundle stage.
Everything else is for you and for whoever builds the composition. It is not parsed.

Pace: Chatterbox reads short sentences fast (about 200 words per minute) and longer ones at a
documentary pace (about 150). Aim for 140 to 160 words per minute of target runtime and avoid
one-clause beats unless you want them snappy. A 60 second short is roughly 140 to 160 words.
-->

**Deliverable:** Voice-over-led explainer, YouTube Short
**Target runtime:** 55 to 60 seconds
**Format:** One continuous animated map with overlays. No talking head, no diagram slides.
**Source:** standalone. Verify the 180 minute figure and the 1985 date before publishing.

## The idea in one line

A rule written for piston airliners is why your two-engine flight is allowed over the middle of the Pacific.

## Narration

1. Look at a flight from Sydney to Los Angeles. For most of it, the nearest runway is hours away.
2. Until the nineteen eighties, a jet with only two engines was not allowed out there. The rule said stay within sixty minutes of an airport.
3. The reasoning was simple. Lose one engine, and you want the other to carry you to land before anything else goes wrong.
4. Then engines got reliable. Very reliable. Regulators began measuring how often they actually failed, and the answer was almost never.
5. So the limit was stretched: ninety minutes, then one hundred and twenty, then one hundred and eighty, each step earned with data.
6. That stretch has a name: ETOPS. Extended range twin operations. Pilots have another reading: engines turn or passengers swim.
7. Today a twin can be more than five hours from the nearest runway, and most long ocean flights are flown by exactly two engines.
8. The map did not change. The confidence did.

## Visuals and animation

One map, one camera, eight beats. Hypsometric atlas style. Overlays appear on the map rather than cutting away from it.

| Beat | Camera | On the map |
|---|---|---|
| 1 | Pacific wide, Sydney and Los Angeles both in frame | Great-circle route draws; a small aircraft rides its head. Airport markers fade in along the rim of the ocean. |
| 2 | Hold | Sixty minute range circles bloom around each airport, leaving a hole over the mid Pacific. Route turns to a dashed line where it crosses the hole. |
| 3 | Slight push on the hole | Aircraft icon with one engine greyed. Label **one engine out**. |
| 4 | Hold | Small counter overlay: failures per flight hour, counting down toward zero. |
| 5 | Pull back to the full ocean | Circles grow in three steps, labelled **90**, **120**, **180**. The hole closes. |
| 6 | Hold | Title overlay: **ETOPS**, with the two expansions on separate lines, the joke in the italic face. |
| 7 | Hold | Route becomes solid; aircraft reaches Los Angeles. |
| 8 | Slow pull out to the opening framing | Closing overlay: **The map did not change. The confidence did.** Hold two seconds. |

## Scenes

```yaml
- type: still
  image: pacific-wide.jpg
  move: zoom-in
  headline: { text: Sydney to Los Angeles, at: Sydney }
  caption: { text: Fourteen hours · one ocean, at: Sydney + 1.2 }

- type: timeline
  from: beat 2
  transition: fade
  range: [1950, 2000]
  tick: 10
  bands:
    - { from: 1953, to: 1985, label: Sixty minute rule, tone: structure }
    - { from: 1985, to: 1988, label: ETOPS 120, tone: accent, at: eighties }

- type: card
  from: Lose
  image: twin-one-engine.png
  headline: ONE ENGINE OUT
  caption: The other must reach land

- type: panels
  from: beat 5
  panels:
    - { image: etops-90.png, label: "90", at: ninety, treatment: illustration }
    - { image: etops-120.png, label: "120", at: twenty, treatment: illustration }
    - { image: etops-180.png, label: "180", at: eighty, treatment: illustration }

- type: still
  from: ETOPS
  transition: fade
  image: twin-over-ocean.jpg
  frame: true
  headline: ETOPS
  caption: Extended range twin operations

- type: montage
  from: beat 8
  transition: fade
  images: [pacific-wide.jpg, twin-over-ocean.jpg]
  headline: { text: The map did not change., at: beat 8 + 0.2 }
  caption: { text: The confidence did., at: confidence - 0.2 }
```

## Publish

title: Why two-engine jets are allowed over the middle of the ocean
tags: aviation, etops, engineering, flying, maps
hashtags: #shorts #aviation #engineering
thumbnail: 0:31

Until the 1980s a twin-engine airliner had to stay within sixty minutes of a runway. Engines got reliable, regulators measured it, and the limit stretched step by step until the Pacific was open. That rule is ETOPS.

Sources in the pinned comment.

## Production notes

- Vertical 9:16. The Sydney to Los Angeles route runs south-west to north-east, which fits a portrait frame at a slightly tighter zoom than landscape.
- One accent colour, used for the route, the range circles and the counter. Nothing else.
- Captions are rendered from the narration alignment, two to four words at a time, centred at about 78 percent of frame height. Keep that band clear of labels.
- Beat 4's counter needs a sourced figure before it can show a number. Until then it shows the trend only.
- Overlays cue on spoken words, not on seconds: the ETOPS title should land on the word "ETOPS", the one-engine icon on "Lose one engine".
