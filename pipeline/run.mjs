#!/usr/bin/env node
// Stones pipeline: for each photo in input/, run a 4-stage Gemini process
// (analysis → brainstorm → design → generate) and emit 4 re-scened variants
// (blur / outdoor / indoor / creative) into stones/<slug>/, plus meta.json
// with every intermediate stage, and a top-level stones/manifest.json the
// gallery reads.
//
// Run:  doppler run -p oria -c dev -- node pipeline/run.mjs
// Key:  GEMINI_AI_STUDIO env var (lives in Doppler, never on disk).
//
// Idempotent: stages already recorded in meta.json are skipped, so a crashed
// or rate-limited run resumes where it left off. Delete stones/<slug>/ to
// fully regenerate a stone.

import { setDefaultResultOrder } from "node:dns";
import { readdir, readFile, writeFile, mkdir, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

setDefaultResultOrder("ipv4first"); // Google APIs unreachable via this box's IPv6

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const INPUT_DIR = path.join(ROOT, "input");
const STONES_DIR = path.join(ROOT, "stones");

const KEY = process.env.GEMINI_AI_STUDIO;
if (!KEY) {
  console.error("GEMINI_AI_STUDIO is not set. Run via: doppler run -p oria -c dev -- node pipeline/run.mjs");
  process.exit(1);
}

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-3.1-flash-image";
const API = "https://generativelanguage.googleapis.com/v1beta/models";

const VARIANTS = ["blur", "outdoor", "indoor", "creative"];

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// ---- Gemini helpers --------------------------------------------------------

async function callGemini(model, parts, { imageOut = false, retries = 3 } = {}) {
  const body = {
    contents: [{ parts }],
    ...(imageOut ? { generationConfig: { responseModalities: ["IMAGE"] } } : {}),
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${model}:generateContent?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt > retries) throw new Error(`${model} failed after ${retries} retries: HTTP ${res.status}`);
      const wait = attempt * 15_000;
      console.log(`    ⏳ HTTP ${res.status}, retry ${attempt}/${retries} in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`${model} HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    const data = await res.json();
    const outParts = data.candidates?.[0]?.content?.parts ?? [];
    if (imageOut) {
      const img = outParts.find((p) => p.inlineData);
      if (!img) throw new Error(`${model} returned no image: ${JSON.stringify(data).slice(0, 500)}`);
      return { mime: img.inlineData.mimeType, buf: Buffer.from(img.inlineData.data, "base64") };
    }
    const text = outParts.filter((p) => p.text).map((p) => p.text).join("");
    if (!text) throw new Error(`${model} returned no text: ${JSON.stringify(data).slice(0, 500)}`);
    return text;
  }
}

function parseJson(text, stage) {
  const m = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/```\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Stage "${stage}" returned unparseable JSON:\n${text.slice(0, 800)}`);
  }
}

// ---- Pipeline stages -------------------------------------------------------

async function stageAnalysis(imagePart) {
  const prompt = `You are a careful observer of stones. Analyze the stone in this photo in depth.

Return ONLY a JSON object:
{
  "name": "a short evocative two-word-max name for this stone",
  "description": "2-3 sentence faithful physical description",
  "shape": "...", "colors": "...", "texture": "...",
  "character": "the stone's personality/mood in one sentence",
  "distinctive_features": ["..."]
}`;
  return parseJson(await callGemini(TEXT_MODEL, [imagePart, { text: prompt }]), "analysis");
}

async function stageBrainstorm(analysis) {
  const prompt = `Here is an analysis of a stone:
${JSON.stringify(analysis, null, 2)}

Brainstorm scene ideas for re-photographing this exact stone in new settings. For each category below, propose 4 distinct, vivid ideas (one line each) that flatter THIS stone's specific colors, texture and character:

- "blur": the stone tack-sharp against a sophisticated, softly blurred background — think fine-art product photography, elegant bokeh, complementary color palette.
- "outdoor": a natural outdoor setting.
- "indoor": an interior setting.
- "creative": an unexpected, artistic, imaginative setting — surreal allowed.

Return ONLY JSON: { "blur": ["..",..], "outdoor": [...], "indoor": [...], "creative": [...] }`;
  return parseJson(await callGemini(TEXT_MODEL, [{ text: prompt }]), "brainstorm");
}

async function stageDesign(analysis, brainstorm) {
  const prompt = `Stone analysis:
${JSON.stringify(analysis, null, 2)}

Brainstormed scene ideas per category:
${JSON.stringify(brainstorm, null, 2)}

For each category (blur, outdoor, indoor, creative): pick the single strongest idea for THIS stone and expand it into a polished image-generation prompt. Each prompt must:
1. Begin with: "Take the exact stone from the provided photo — preserve its shape, texture, colors and every distinctive feature faithfully —"
2. Then describe placement, setting, lighting, camera/lens feel, and mood in rich detail.
3. For "blur": the background must be sophisticatedly blurred (shallow depth of field, refined bokeh), stone in crisp focus.

Also write a short poetic caption (under 12 words) per category.

Return ONLY JSON:
{ "blur": {"prompt": "...", "caption": "..."}, "outdoor": {...}, "indoor": {...}, "creative": {...} }`;
  return parseJson(await callGemini(TEXT_MODEL, [{ text: prompt }]), "design");
}

async function stageGenerate(imagePart, designedPrompt) {
  return callGemini(IMAGE_MODEL, [imagePart, { text: designedPrompt }], { imageOut: true });
}

// ---- Per-stone driver ------------------------------------------------------

function slugify(filename) {
  return path.basename(filename, path.extname(filename))
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stone";
}

async function loadMeta(dir) {
  try { return JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8")); }
  catch { return {}; }
}

async function saveMeta(dir, meta) {
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
}

async function processStone(file) {
  const slug = slugify(file);
  const ext = path.extname(file).toLowerCase();
  const dir = path.join(STONES_DIR, slug);
  await mkdir(dir, { recursive: true });

  const meta = await loadMeta(dir);
  meta.slug = slug;
  meta.sourceFile = file;

  // original copied alongside variants so the gallery can show it
  const originalName = `original${ext}`;
  if (!existsSync(path.join(dir, originalName))) {
    await copyFile(path.join(INPUT_DIR, file), path.join(dir, originalName));
  }
  meta.original = originalName;

  const buf = await readFile(path.join(INPUT_DIR, file));
  const imagePart = { inlineData: { mimeType: MIME[ext] ?? "image/jpeg", data: buf.toString("base64") } };

  if (!meta.analysis) {
    console.log(`  [1/4] analysis…`);
    meta.analysis = await stageAnalysis(imagePart);
    await saveMeta(dir, meta);
    console.log(`        → "${meta.analysis.name}": ${meta.analysis.character}`);
  } else console.log(`  [1/4] analysis ✓ (cached)`);

  if (!meta.brainstorm) {
    console.log(`  [2/4] brainstorm…`);
    meta.brainstorm = await stageBrainstorm(meta.analysis);
    await saveMeta(dir, meta);
  } else console.log(`  [2/4] brainstorm ✓ (cached)`);

  if (!meta.design) {
    console.log(`  [3/4] design…`);
    meta.design = await stageDesign(meta.analysis, meta.brainstorm);
    await saveMeta(dir, meta);
  } else console.log(`  [3/4] design ✓ (cached)`);

  meta.variants ??= {};
  for (const v of VARIANTS) {
    const outName = `${v}.jpg`;
    if (meta.variants[v] && existsSync(path.join(dir, outName))) {
      console.log(`  [4/4] generate ${v} ✓ (cached)`);
      continue;
    }
    console.log(`  [4/4] generate ${v}…`);
    const { buf: img } = await stageGenerate(imagePart, meta.design[v].prompt);
    await writeFile(path.join(dir, outName), img);
    meta.variants[v] = { file: outName, caption: meta.design[v].caption };
    await saveMeta(dir, meta);
  }

  return meta;
}

// ---- Manifest --------------------------------------------------------------

async function rebuildManifest() {
  const entries = [];
  let dirs = [];
  try { dirs = await readdir(STONES_DIR); } catch { /* none yet */ }
  for (const d of dirs.sort()) {
    const dir = path.join(STONES_DIR, d);
    if (!(await stat(dir)).isDirectory()) continue;
    const meta = await loadMeta(dir);
    if (!meta.variants || VARIANTS.some((v) => !meta.variants[v])) continue; // incomplete
    entries.push({
      id: meta.slug,
      name: meta.analysis?.name ?? meta.slug,
      character: meta.analysis?.character ?? "",
      original: `stones/${d}/${meta.original}`,
      variants: Object.fromEntries(
        VARIANTS.map((v) => [v, { src: `stones/${d}/${meta.variants[v].file}`, caption: meta.variants[v].caption }]),
      ),
    });
  }
  await mkdir(STONES_DIR, { recursive: true });
  await writeFile(path.join(STONES_DIR, "manifest.json"), JSON.stringify(entries, null, 2));
  return entries;
}

// ---- Main ------------------------------------------------------------------

await mkdir(INPUT_DIR, { recursive: true });
const files = (await readdir(INPUT_DIR)).filter((f) => MIME[path.extname(f).toLowerCase()]);

if (!files.length) {
  console.log(`No photos in ${INPUT_DIR}. Drop .jpg/.png/.webp stone photos there and rerun.`);
} else {
  console.log(`${files.length} photo(s) in input/\n`);
  let failed = 0;
  for (const file of files) {
    console.log(`◆ ${file}`);
    try {
      await processStone(file);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${file}: ${e.message}\n    (progress saved — rerun to resume)`);
    }
  }
  if (failed) process.exitCode = 1;
}

const manifest = await rebuildManifest();
console.log(`\nmanifest: ${manifest.length} complete stone(s) → stones/manifest.json`);
