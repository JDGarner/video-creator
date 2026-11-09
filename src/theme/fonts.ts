import * as ArchivoNarrow from "@remotion/google-fonts/ArchivoNarrow";
import * as BodoniModa from "@remotion/google-fonts/BodoniModa";
import * as DMMono from "@remotion/google-fonts/DMMono";
import * as Fraunces from "@remotion/google-fonts/Fraunces";
import * as IBMPlexMono from "@remotion/google-fonts/IBMPlexMono";
import * as JetBrainsMono from "@remotion/google-fonts/JetBrainsMono";
import * as Karla from "@remotion/google-fonts/Karla";
import * as Literata from "@remotion/google-fonts/Literata";
import * as Newsreader from "@remotion/google-fonts/Newsreader";
import * as Spectral from "@remotion/google-fonts/Spectral";
import * as SpectralSC from "@remotion/google-fonts/SpectralSC";
import * as Vollkorn from "@remotion/google-fonts/Vollkorn";
import * as WorkSans from "@remotion/google-fonts/WorkSans";
import * as Archivo from "@remotion/google-fonts/Archivo";
import * as CormorantGaramond from "@remotion/google-fonts/CormorantGaramond";
import * as EBGaramond from "@remotion/google-fonts/EBGaramond";
import * as InterTight from "@remotion/google-fonts/InterTight";
import * as Lora from "@remotion/google-fonts/Lora";
import * as Manrope from "@remotion/google-fonts/Manrope";
import * as RedHatMono from "@remotion/google-fonts/RedHatMono";
import * as SourceSerif4 from "@remotion/google-fonts/SourceSerif4";
import * as SpaceGrotesk from "@remotion/google-fonts/SpaceGrotesk";
import * as Alegreya from "@remotion/google-fonts/Alegreya";
import * as Bitter from "@remotion/google-fonts/Bitter";
import * as LibreBaskerville from "@remotion/google-fonts/LibreBaskerville";
import * as OldStandardTT from "@remotion/google-fonts/OldStandardTT";
import * as ZillaSlab from "@remotion/google-fonts/ZillaSlab";
import type { GoogleFont } from "@remotion/google-fonts";
import type { FontSpec, Theme } from "./tokens";
import { THEMES } from "./themes";

/** Adding a font to a theme means adding its module here too. */
const LOADERS: Record<string, GoogleFont> = {
  Alegreya: Alegreya as unknown as GoogleFont,
  Bitter: Bitter as unknown as GoogleFont,
  "Libre Baskerville": LibreBaskerville as unknown as GoogleFont,
  "Old Standard TT": OldStandardTT as unknown as GoogleFont,
  "Zilla Slab": ZillaSlab as unknown as GoogleFont,
  Archivo: Archivo as unknown as GoogleFont,
  "Cormorant Garamond": CormorantGaramond as unknown as GoogleFont,
  "EB Garamond": EBGaramond as unknown as GoogleFont,
  "Inter Tight": InterTight as unknown as GoogleFont,
  Lora: Lora as unknown as GoogleFont,
  Manrope: Manrope as unknown as GoogleFont,
  "Red Hat Mono": RedHatMono as unknown as GoogleFont,
  "Source Serif 4": SourceSerif4 as unknown as GoogleFont,
  "Space Grotesk": SpaceGrotesk as unknown as GoogleFont,
  "Archivo Narrow": ArchivoNarrow as unknown as GoogleFont,
  "Bodoni Moda": BodoniModa as unknown as GoogleFont,
  "DM Mono": DMMono as unknown as GoogleFont,
  Fraunces: Fraunces as unknown as GoogleFont,
  "IBM Plex Mono": IBMPlexMono as unknown as GoogleFont,
  "JetBrains Mono": JetBrainsMono as unknown as GoogleFont,
  Karla: Karla as unknown as GoogleFont,
  Literata: Literata as unknown as GoogleFont,
  Newsreader: Newsreader as unknown as GoogleFont,
  Spectral: Spectral as unknown as GoogleFont,
  "Spectral SC": SpectralSC as unknown as GoogleFont,
  Vollkorn: Vollkorn as unknown as GoogleFont,
  "Work Sans": WorkSans as unknown as GoogleFont,
};

const families = new Map<string, string>();

function load(spec: FontSpec): void {
  const loader = LOADERS[spec.family];
  if (!loader) {
    throw new Error(`No font loader registered for "${spec.family}". Add it to src/theme/fonts.ts`);
  }
  const key = `${spec.family}/${spec.style}`;
  if (families.has(key)) return;
  const { fontFamily } = loader.loadFont(spec.style, {
    weights: spec.weights.map(String),
    subsets: ["latin"],
  });
  families.set(key, fontFamily);
}

// Module top level, as Remotion requires: every theme's fonts are declared
// before any composition renders, and delayRender is handled by the package.
for (const theme of Object.values(THEMES) as Theme[]) {
  for (const spec of Object.values(theme.fonts)) load(spec);
}

export function fontFamily(spec: FontSpec): string {
  const family = families.get(`${spec.family}/${spec.style}`);
  if (!family) throw new Error(`Font "${spec.family}" was not loaded`);
  const generic = spec.family.includes("Mono") ? "monospace" : /Archivo|Karla|Work Sans|Inter Tight|Space Grotesk|Manrope/.test(spec.family) ? "sans-serif" : "serif";
  return `"${family}", ${generic}`;
}
