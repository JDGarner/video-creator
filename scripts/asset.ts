/**
 * Fetch an image into a short's assets/ and record it in assets.yaml: `pnpm asset <video> <what>`.
 *
 *   pnpm asset <video> phylopic:<taxon> [--as name.svg] [--index N]   silhouette from PhyloPic
 *   pnpm asset <video> phylopic:<taxon> --list                        show the candidates first
 *   pnpm asset <video> <commons file page URL | File:Name> [--as name.jpg] [--from ~/Downloads/x.jpg]
 *       --from uses a file you downloaded yourself (Commons throttles some originals) but still
 *       records source, licence and credit from the API
 *   pnpm asset <video> --search "<words>" [--n 8]                      Commons candidates with thumbnails
 *
 * Source, licence and credit come from the APIs, so the bookkeeping cannot drift from the file.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import YAML, { isSeq, type YAMLMap } from "yaml";

const REPO = path.resolve(import.meta.dirname, "..");
const UA = "video-creator-asset-fetcher/0.1 (local tooling for a Remotion project)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fail(msg: string): never {
  console.error(`\n${msg}`);
  process.exit(1);
}

/** Commons rate-limits anonymous clients quickly, so back off and retry on 429. */
async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.status === 429 && attempt < 4) {
      await sleep(2500 * 2 ** attempt);
      continue;
    }
    if (!r.ok) fail(`${r.status} from ${url}`);
    return (await r.json()) as T;
  }
}

async function download(rawUrl: string, to: string): Promise<void> {
  const url = rawUrl.replace(/\?utm_[^#]*$/, "");
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status === 429 && attempt < 4) {
      await sleep(2500 * 2 ** attempt);
      continue;
    }
    if (!r.ok) fail(`${r.status} downloading ${url}`);
    mkdirSync(path.dirname(to), { recursive: true });
    writeFileSync(to, Buffer.from(await r.arrayBuffer()));
    return;
  }
}

const LICENCES: [RegExp, string][] = [
  [/publicdomain\/zero/, "CC0"],
  [/publicdomain\/mark/, "public domain"],
  [/licenses\/by-sa\/(\d\.\d)/, "CC BY-SA $1"],
  [/licenses\/by-nc-sa\/(\d\.\d)/, "CC BY-NC-SA $1"],
  [/licenses\/by-nc\/(\d\.\d)/, "CC BY-NC $1"],
  [/licenses\/by\/(\d\.\d)/, "CC BY $1"],
];
const licenceName = (url: string) => LICENCES.reduce<string | null>((acc, [re, name]) => acc ?? (re.test(url) ? url.replace(/.*/, name.replace("$1", url.match(re)?.[1] ?? "")) : null), null) ?? url;

type Entry = { file: string; source: string; licence: string; credit?: string; note?: string };

/** Add or replace the entry for `file`, keeping the file's comments and any `note` already there. */
function record(video: string, entry: Entry): void {
  const p = path.join(REPO, "stories", "shorts", video, "assets.yaml");
  const doc = existsSync(p) ? YAML.parseDocument(readFileSync(p, "utf8")) : new YAML.Document([]);
  if (!isSeq(doc.contents)) doc.contents = doc.createNode([]) as unknown as typeof doc.contents;
  const seq = doc.contents as unknown as YAML.YAMLSeq<YAMLMap>;
  const existing = seq.items.find((m) => m.get("file") === entry.file);
  const note = existing?.get("note") as string | undefined;
  const node = doc.createNode({ ...entry, ...(note && !entry.note ? { note } : {}) }) as YAMLMap;
  if (existing) seq.items[seq.items.indexOf(existing)] = node;
  else seq.items.push(node);
  writeFileSync(p, doc.toString({ lineWidth: 0 }));
}

// ---------- PhyloPic

type PhyloImage = { uuid: string; attribution: string | null; _links: { license: { href: string }; specificNode: { title: string }; vectorFile?: { href: string }; rasterFiles?: { href: string; sizes: string }[]; thumbnailFiles?: { href: string }[] } };

async function phylopic(video: string, taxon: string, opts: { as?: string; index: number; list: boolean }): Promise<void> {
  const api = "https://api.phylopic.org";
  const { build } = await getJson<{ build: number }>(api);
  const q = encodeURIComponent(taxon.toLowerCase());
  const list = await fetch(`${api}/images?build=${build}&filter_name=${q}&page=0`, { headers: { "User-Agent": UA } });
  if (!list.ok) {
    const alt = await getJson<{ matches: string[] }>(`${api}/autocomplete?build=${build}&query=${q}`);
    fail(alt.matches.length ? `PhyloPic has no "${taxon}"; names it knows: ${alt.matches.join(", ")}` : `PhyloPic has nothing for "${taxon}"; try a related genus or family`);
  }
  const items = ((await list.json()) as { _links: { items: { href: string; title: string }[] } })._links.items;
  const images = await Promise.all(items.map((i) => getJson<PhyloImage>(`${api}${i.href}`)));
  if (opts.list || opts.index >= images.length) {
    images.forEach((img, i) => console.log(`${i}  ${img._links.specificNode.title}  ${licenceName(img._links.license.href)}  ${img.attribution ?? "no attribution"}\n   ${img._links.thumbnailFiles?.[0]?.href ?? ""}`));
    if (opts.index >= images.length) fail(`--index ${opts.index} is out of range`);
    return;
  }
  const img = images[opts.index]!;
  const vector = img._links.vectorFile?.href;
  const file = opts.as ?? `${taxon.toLowerCase().split(/\s+/)[0]}.${vector ? "svg" : "png"}`;
  const url = vector ?? img._links.rasterFiles?.[0]?.href;
  if (!url) fail("image has no downloadable file");
  await download(url, path.join(REPO, "stories", "shorts", video, "assets", file));
  const licence = licenceName(img._links.license.href);
  record(video, { file, source: `https://www.phylopic.org/images/${img.uuid}`, licence, ...(img.attribution ? { credit: img.attribution } : {}) });
  console.log(`${file}  <- ${img._links.specificNode.title}  ${licence}  ${img.attribution ?? ""}`);
}

// ---------- Wikimedia Commons

type ImageInfo = { url: string; descriptionurl: string; thumburl?: string; width: number; extmetadata: Record<string, { value: string }> };

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/**
 * Image info with a real scaled URL. upload.wikimedia.org throttles anonymous downloads of
 * original files but serves scaled copies freely, and only scales to its standard widths, so try
 * those from `width` down and keep the first the API actually scaled.
 */
async function commonsInfo(title: string, width: number): Promise<ImageInfo> {
  const fetchInfo = async (w: number) => {
    const q = new URLSearchParams({ action: "query", titles: title, prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: String(w), format: "json" });
    const j = await getJson<{ query: { pages: Record<string, { imageinfo?: ImageInfo[] }> } }>(`https://commons.wikimedia.org/w/api.php?${q}`);
    const page = Object.values(j.query.pages)[0];
    if (!page?.imageinfo?.[0]) fail(`Commons has no ${title}`);
    return page.imageinfo[0];
  };
  let info = await fetchInfo(width);
  for (const w of [1280, 1024, 800, 640].filter((w) => w < width)) {
    if (info.thumburl && !/thumbnail_unscaled/.test(info.thumburl)) break;
    await sleep(400);
    info = await fetchInfo(w);
  }
  if (info.thumburl && /thumbnail_unscaled/.test(info.thumburl)) delete info.thumburl;
  return info;
}

async function commons(video: string, ref: string, opts: { as?: string; from?: string }): Promise<void> {
  const title = decodeURIComponent(ref.match(/File:[^?#]+/)?.[0] ?? fail(`not a Commons file reference: ${ref}`)).replace(/_/g, " ");
  const info = await commonsInfo(title, 1280);
  const m = info.extmetadata;
  const ext = path.extname(title).toLowerCase();
  const file = opts.as ?? title.replace(/^File:/, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  // the API's scaled URL keeps photographs under the pipeline's 2160 px without a 40 MB original
  const dest = path.join(REPO, "stories", "shorts", video, "assets", file);
  if (opts.from) {
    const src = opts.from.replace(/^~/, process.env.HOME ?? "~");
    if (!existsSync(src)) fail(`no such file: ${src}`);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  } else {
    if (ext !== ".svg" && !info.thumburl) fail(`Commons will not scale ${title} and throttles its original; download it from ${info.descriptionurl} and rerun with --from <file>`);
    await download(ext !== ".svg" && info.thumburl ? info.thumburl : info.url, dest);
  }
  const licence = m.LicenseShortName?.value ?? "unknown";
  const artist = strip(m.Artist?.value ?? m.Credit?.value ?? "");
  record(video, { file, source: info.descriptionurl, licence, credit: `${artist || "unknown author"}, Wikimedia Commons` });
  console.log(`${file}  <- ${title}  ${licence}  ${artist}`);
}

async function search(video: string, words: string, n: number): Promise<void> {
  const q = new URLSearchParams({ action: "query", list: "search", srsearch: `${words} filetype:bitmap`, srnamespace: "6", srlimit: String(n), format: "json" });
  const j = await getJson<{ query: { search: { title: string }[] } }>(`https://commons.wikimedia.org/w/api.php?${q}`);
  const dir = path.join(REPO, "out", "shorts", video, "candidates");
  mkdirSync(dir, { recursive: true });
  const slug = words.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  for (const [i, hit] of j.query.search.entries()) {
    await sleep(400);
    const info = await commonsInfo(hit.title, 640);
    const m = info.extmetadata;
    const thumb = path.join(dir, `${slug}-${i + 1}${path.extname(hit.title).toLowerCase() || ".jpg"}`);
    if (info.thumburl) await download(info.thumburl, thumb);
    console.log(`${i + 1}. ${hit.title}\n   ${m.LicenseShortName?.value ?? "?"}  ${strip(m.Artist?.value ?? "")}  ${info.width}px\n   ${info.descriptionurl}\n   ${path.relative(REPO, thumb)}`);
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { as: { type: "string" }, from: { type: "string" }, index: { type: "string", default: "0" }, list: { type: "boolean", default: false }, search: { type: "string" }, n: { type: "string", default: "8" } },
  });
  const [video, what] = positionals;
  if (!video || !existsSync(path.join(REPO, "stories", "shorts", video))) fail("usage: pnpm asset <video> phylopic:<taxon> | <commons File URL> | --search \"words\"");
  if (values.search) return search(video, values.search, parseInt(values.n, 10));
  if (!what) fail("what to fetch? phylopic:<taxon>, a Commons file URL, or --search");
  if (what.startsWith("phylopic:")) return phylopic(video, what.slice("phylopic:".length), { as: values.as, index: parseInt(values.index, 10), list: values.list });
  return commons(video, what, { as: values.as, from: values.from });
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
