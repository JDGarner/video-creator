import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { geoPath } from "d3-geo";
import type { MapPalette } from "../../theme/themes/map";
import { landFeatures } from "../globe/data";
import { hexToRgb, loadImage } from "./raster";
import { mercatorScale, projectionFor, type MapCamera } from "./camera";

const RASTERS = {
  relief: staticFile("textures/relief-50m.jpg"),
  ocean: staticFile("textures/ocean-50m.jpg"),
  hypso: staticFile("textures/hypso-50m.jpg"),
};

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** Inverse Mercator per fragment, then the same land/sea composition as MapBase, on the GPU. */
const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_k;        // mercator scale (px per radian)
uniform float u_lon0;     // centre longitude, radians
uniform float u_y0;       // mercator y of centre latitude
uniform sampler2D u_hypso;
uniform sampler2D u_ocean;
uniform sampler2D u_relief;
uniform sampler2D u_mask;
uniform vec3 u_sea, u_seaTint, u_land, u_landTint;
uniform float u_seaStrength, u_seaLift, u_landStrength;
uniform float u_useHypso, u_useRelief, u_useSeaShade;
const float PI = 3.141592653589793;

float shade(float g, float lift) {
  float dark = max(0.0, (235.0 - g) / 235.0 - 0.1);
  float light = lift > 0.0 ? max(0.0, (g - 215.0) / 40.0) * lift : 0.0;
  return dark - light;
}

void main() {
  // screen px, y down
  float px = gl_FragCoord.x;
  float py = u_res.y - gl_FragCoord.y;
  float lon = (px - u_res.x * 0.5) / u_k + u_lon0;
  float my = (u_res.y * 0.5 - py) / u_k + u_y0;
  float lat = 2.0 * atan(exp(my)) - PI * 0.5;
  // wrap longitude into [-PI, PI)
  lon = mod(lon + PI, 2.0 * PI) - PI;
  vec2 uv = vec2((lon + PI) / (2.0 * PI), (lat + PI * 0.5) / PI);

  vec3 sea = u_sea;
  if (u_useSeaShade > 0.5) {
    float g = texture(u_ocean, uv).r * 255.0;
    float amt = shade(g, u_seaLift) * u_seaStrength;
    sea = amt >= 0.0 ? mix(u_sea, u_seaTint, clamp(amt, 0.0, 1.0)) : mix(u_sea, vec3(1.0), clamp(-amt, 0.0, 1.0));
  }
  vec3 land = u_land;
  if (u_useHypso > 0.5) land = mix(texture(u_hypso, uv).rgb, u_land, 0.15);
  if (u_useRelief > 0.5) {
    float g = texture(u_relief, uv).r * 255.0;
    land = mix(land, u_landTint, clamp(shade(g, 0.0) * u_landStrength, 0.0, 1.0));
  }
  float a = texture(u_mask, gl_FragCoord.xy / u_res).a;
  outColor = vec4(mix(sea, land, a), 1.0);
}`;

type Gl = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  mask: WebGLTexture;
  maskCanvas: HTMLCanvasElement;
  uniforms: Record<string, WebGLUniformLocation | null>;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader error");
  return sh;
}

function texture(gl: WebGL2RenderingContext, unit: number, src: TexImageSource | null): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

type Props = { camera: MapCamera; palette: MapPalette; width: number; height: number };

/**
 * GPU map base. Rasters are uploaded once; each frame uploads a fresh screen-space land mask
 * (a canvas path fill, a few ms) and redraws a full-screen quad. Any zoom or pan is one draw call.
 */
export const GlMapBase: React.FC<Props> = ({ camera, palette, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<Gl | null>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`gl map ${palette.name}`));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
      if (!gl) throw new Error("WebGL2 unavailable");
      const [hypso, ocean, relief] = await Promise.all([
        palette.hypsometric ? loadImage(RASTERS.hypso) : null,
        palette.seaShade ? loadImage(RASTERS.ocean) : null,
        palette.landShade ? loadImage(RASTERS.relief) : null,
      ]);
      if (cancelled) return;

      const program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
      gl.useProgram(program);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      texture(gl, 0, hypso);
      texture(gl, 1, ocean);
      texture(gl, 2, relief);
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const mask = texture(gl, 3, null);

      const names = [
        "u_res", "u_k", "u_lon0", "u_y0", "u_hypso", "u_ocean", "u_relief", "u_mask",
        "u_sea", "u_seaTint", "u_land", "u_landTint", "u_seaStrength", "u_seaLift", "u_landStrength",
        "u_useHypso", "u_useRelief", "u_useSeaShade",
      ];
      const uniforms = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));
      gl.uniform1i(uniforms.u_hypso!, 0);
      gl.uniform1i(uniforms.u_ocean!, 1);
      gl.uniform1i(uniforms.u_relief!, 2);
      gl.uniform1i(uniforms.u_mask!, 3);
      const v3 = (name: string, hex: string) => {
        const [r, g, b] = hexToRgb(hex);
        gl.uniform3f(uniforms[name]!, r / 255, g / 255, b / 255);
      };
      v3("u_sea", palette.sea);
      v3("u_seaTint", palette.seaShade?.tint ?? palette.sea);
      v3("u_land", palette.land);
      v3("u_landTint", palette.landShade?.tint ?? palette.land);
      gl.uniform1f(uniforms.u_seaStrength!, palette.seaShade?.strength ?? 0);
      gl.uniform1f(uniforms.u_seaLift!, palette.seaShade?.lift ?? 0);
      gl.uniform1f(uniforms.u_landStrength!, palette.landShade?.strength ?? 0);
      gl.uniform1f(uniforms.u_useHypso!, palette.hypsometric ? 1 : 0);
      gl.uniform1f(uniforms.u_useRelief!, palette.landShade ? 1 : 0);
      gl.uniform1f(uniforms.u_useSeaShade!, palette.seaShade ? 1 : 0);
      gl.uniform2f(uniforms.u_res!, width, height);
      gl.viewport(0, 0, width, height);

      glRef.current = { gl, program, mask, maskCanvas, uniforms };
      setReady(true);
    })().catch((e) => {
      console.error(e);
      continueRender(handle);
    });
    return () => {
      cancelled = true;
    };
  }, [palette, width, height, handle]);

  useLayoutEffect(() => {
    const g = glRef.current;
    if (!g || !ready) return;
    const { gl, mask, maskCanvas, uniforms } = g;
    const k = mercatorScale(camera.spanDeg, width);
    const lon0 = (camera.center[0] * Math.PI) / 180;
    const lat0 = (camera.center[1] * Math.PI) / 180;
    const y0 = Math.log(Math.tan(Math.PI / 4 + lat0 / 2));

    // screen-space land mask for this camera
    const mctx = maskCanvas.getContext("2d")!;
    mctx.clearRect(0, 0, width, height);
    const path = geoPath(projectionFor(camera, width, height), mctx);
    mctx.beginPath();
    path(landFeatures("50m"));
    mctx.fillStyle = "rgb(0,0,0)";
    mctx.fill();
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, mask);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);

    gl.uniform1f(uniforms.u_k!, k);
    gl.uniform1f(uniforms.u_lon0!, lon0);
    gl.uniform1f(uniforms.u_y0!, y0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
    continueRender(handle);
  }, [camera, ready, width, height, handle]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ position: "absolute", inset: 0 }} />;
};
