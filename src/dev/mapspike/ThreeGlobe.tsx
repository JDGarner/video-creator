import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { Paper } from "../../primitives/Paper";
import { useColor, useTheme } from "../../theme/ThemeProvider";
import { withAlpha } from "../../lib/color";
import { greatCircle, midpoint, toCartesian } from "../../lib/geo";
import { countryBorders, landFeatures } from "../../viz/globe/data";
import { CityLabel, ROUTE, SpikeChrome } from "./shared";

const DEG = Math.PI / 180;
const CAMERA = { fov: 28, z: 4.3 };
const RELIEF = staticFile("textures/relief-50m.jpg");

/** Paint the flat map into an equirectangular texture using the same theme colours. */
function buildTexture(colors: { water: string; land: string; ink: string }): THREE.CanvasTexture {
  const w = 4096;
  const h = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const projection = geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]);
  const path = geoPath(projection, ctx);
  ctx.fillStyle = colors.water;
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = withAlpha(colors.ink, 0.16);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  path(landFeatures("50m"));
  ctx.fillStyle = colors.land;
  ctx.fill();
  ctx.strokeStyle = withAlpha(colors.ink, 0.6);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  path(countryBorders());
  ctx.strokeStyle = withAlpha(colors.ink, 0.28);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const RIM_VERT = `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIM_FRAG = `uniform vec3 color; varying vec3 vNormal; void main() { float i = pow(max(0.0, 0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2); gl_FragColor = vec4(color, i * 0.3); }`;

/** C: a real sphere via react-three-fiber, flat-shaded textures from the same data, relief as a bump map. */
export const ThreeGlobe: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { scale } = useTheme();
  const colors = {
    water: useColor("water"),
    land: useColor("land"),
    ink: useColor("ink"),
    accent: useColor("accent"),
    structure: useColor("structure"),
  };
  const [handle] = useState(() => delayRender("globe textures"));
  const [bump, setBump] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    new THREE.TextureLoader().load(
      RELIEF,
      (t) => {
        setBump(t);
        continueRender(handle);
      },
      undefined,
      () => continueRender(handle),
    );
  }, [handle]);

  const map = useMemo(() => buildTexture(colors), [colors.water, colors.land, colors.ink]);

  const scene = useMemo(() => {
    const [midLon, midLat] = midpoint(ROUTE.from.coord, ROUTE.to.coord);
    const euler = new THREE.Euler(midLat * DEG, (-90 - midLon) * DEG, 0, "XYZ");
    const pts = greatCircle(ROUTE.from.coord, ROUTE.to.coord, 96).map((p, i, arr) => {
      const t = i / (arr.length - 1);
      const r = 1 + 0.06 * Math.sin(t * Math.PI);
      return new THREE.Vector3(...toCartesian(p, r));
    });
    const arc = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 128, 0.0045, 8, false);

    const camera = new THREE.PerspectiveCamera(CAMERA.fov, width / height, 0.1, 100);
    camera.position.set(0, 0, CAMERA.z);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const toScreen = (lonlat: [number, number]) => {
      const v = new THREE.Vector3(...toCartesian(lonlat, 1)).applyEuler(euler).project(camera);
      return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height] as [number, number];
    };
    return {
      euler,
      arc,
      from: toScreen(ROUTE.from.coord),
      to: toScreen(ROUTE.to.coord),
      fromPos: toCartesian(ROUTE.from.coord, 1.002),
      toPos: toCartesian(ROUTE.to.coord, 1.002),
    };
  }, [width, height]);

  const rimUniforms = useMemo(() => ({ color: { value: new THREE.Color(colors.structure) } }), [colors.structure]);

  return (
    <Paper variant="light">
      <AbsoluteFill>
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ fov: CAMERA.fov, position: [0, 0, CAMERA.z], near: 0.1, far: 100 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          {/* Mostly ambient so the theme colours survive; a weak key light only exists to reveal the bump map. */}
          <ambientLight intensity={2.6} />
          <directionalLight position={[-4, 3, 5]} intensity={0.55} />
          <group rotation={scene.euler}>
            <mesh>
              <sphereGeometry args={[1, 128, 128]} />
              <meshStandardMaterial map={map} bumpMap={bump ?? undefined} bumpScale={bump ? 0.03 : 0} roughness={1} metalness={0} />
            </mesh>
            <mesh geometry={scene.arc}>
              <meshBasicMaterial color={colors.accent} />
            </mesh>
            {[scene.fromPos, scene.toPos].map((p, i) => (
              <mesh key={i} position={p}>
                <sphereGeometry args={[0.014, 24, 24]} />
                <meshBasicMaterial color={colors.accent} />
              </mesh>
            ))}
          </group>
          <mesh>
            <sphereGeometry args={[1.04, 96, 96]} />
            <shaderMaterial
              vertexShader={RIM_VERT}
              fragmentShader={RIM_FRAG}
              uniforms={rimUniforms}
              side={THREE.BackSide}
              transparent
              depthWrite={false}
            />
          </mesh>
        </ThreeCanvas>
        <CityLabel name={ROUTE.from.name} coord={ROUTE.from.coord} x={scene.from[0]} y={scene.from[1]} side="left" />
        <CityLabel name={ROUTE.to.name} coord={ROUTE.to.coord} x={scene.to[0]} y={scene.to[1]} side="right" />
        <SpikeChrome title="C · 3D sphere · react-three-fiber, flat texture + relief bump" note={`Natural Earth 50m · bump ${bump ? "on" : "off"} · ${Math.round(8 * scale)}x aniso`} />
      </AbsoluteFill>
    </Paper>
  );
};
