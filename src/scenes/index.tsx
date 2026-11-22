import React from "react";
import { CardScene } from "./CardScene";
import { LandmassScene } from "./LandmassScene";
import { MontageScene } from "./MontageScene";
import { PanelsScene } from "./PanelsScene";
import type { Scene } from "./schema";
import { SilhouettesScene } from "./SilhouettesScene";
import { StillScene } from "./StillScene";
import { TimelineScene } from "./TimelineScene";

/** Scene type -> component. Adding a type: schema in schema.ts, component here, `pnpm docs:scenes`. */
export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case "still":
      return <StillScene scene={scene} />;
    case "card":
      return <CardScene scene={scene} />;
    case "timeline":
      return <TimelineScene scene={scene} />;
    case "panels":
      return <PanelsScene scene={scene} />;
    case "silhouettes":
      return <SilhouettesScene scene={scene} />;
    case "montage":
      return <MontageScene scene={scene} />;
    case "landmass":
      return <LandmassScene scene={scene} />;
  }
};

export { SceneSchema, ScenesSchema, type Scene, type SceneInput } from "./schema";
