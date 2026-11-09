import React from "react";
import { Composition, Still } from "remotion";
import { contactHeight, DirectionsContact } from "./dev/DirectionsContact";
import { MapSpikeContact, MapSpikePanel, mapSpikeContactSize, PANELS } from "./dev/mapspike/MapSpike";
import { MapSpike2Contact, MapSpike2Panel, mapSpike2ContactSize, SPIKE2_NAMES } from "./dev/mapspike2/MapSpike2";
import { Scene1, SCENE1_DURATION_SEC } from "./dev/makassan/Scene1";
import { Scene2 } from "./dev/makassan/Scene2";
import { ThemeSheet } from "./dev/ThemeSheet";
import { ROUNDS, THEMES } from "./theme/themes";

const VARIANTS = ["light", "dark"] as const;

export const Root: React.FC = () => (
  <>
    {Object.keys(THEMES).map((themeName) =>
      VARIANTS.map((variant) => (
        <Still
          key={`${themeName}-${variant}`}
          id={`sheet-${themeName}-${variant}`}
          component={ThemeSheet}
          width={1920}
          height={1080}
          defaultProps={{ themeName: themeName as keyof typeof THEMES, variant }}
        />
      )),
    )}
    {Object.entries(ROUNDS).map(([round, names]) => (
      <Still
        key={round}
        id={`directions-${round}`}
        component={DirectionsContact}
        width={1920 + 24 * 3}
        height={contactHeight(names.length)}
        defaultProps={{ names }}
      />
    ))}
    {(Object.keys(PANELS) as (keyof typeof PANELS)[]).map((panel) => (
      <Still key={panel} id={`spike-map-${panel}`} component={MapSpikePanel} width={1920} height={1080} defaultProps={{ panel }} />
    ))}
    <Still id="spike-map-contact" component={MapSpikeContact} {...mapSpikeContactSize()} />
    {SPIKE2_NAMES.map((palette) => (
      <Still key={palette} id={`spike2-map-${palette}`} component={MapSpike2Panel} width={1920} height={1080} defaultProps={{ palette }} />
    ))}
    <Still id="spike2-map-contact" component={MapSpike2Contact} {...mapSpike2ContactSize()} />
    <Composition id="makassan-s1" component={Scene1} width={1920} height={1080} fps={30} durationInFrames={SCENE1_DURATION_SEC * 30} />
    <Still id="makassan-s2" component={Scene2} width={1920} height={1080} />
  </>
);
