import {
  mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { DATA_DIR } from "../config.js";

const PAGES_DIR = join(DATA_DIR, "pages");
const NOTES_DIR = join(DATA_DIR, "notes");
const SOLUTIONS_DIR = join(DATA_DIR, "solutions");
const MANIFEST = join(DATA_DIR, "manifest.json");
const TASKS = join(DATA_DIR, "tasks.json");

function ensureDirs() {
  for (const d of [DATA_DIR, PAGES_DIR, NOTES_DIR, SOLUTIONS_DIR]) {
    mkdirSync(d, { recursive: true });
  }
}

export function slugFor(url) {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 8);
  const base = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "page"}-${hash}`;
}

function readJSON(file, fallback) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
}
function writeJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function savePage({ url, title, text }) {
  ensureDirs();
  const slug = slugFor(url);
  const record = { url, title, text, fetchedAt: new Date().toISOString() };
  writeJSON(join(PAGES_DIR, `${slug}.json`), record);

  const manifest = readJSON(MANIFEST, []);
  const entry = { slug, url, title, fetchedAt: record.fetchedAt, chars: text.length };
  const at = manifest.findIndex((m) => m.slug === slug);
  if (at >= 0) manifest[at] = entry;
  else manifest.push(entry);
  writeJSON(MANIFEST, manifest);
  return slug;
}

export function listPages() {
  return readJSON(MANIFEST, []);
}
export function readPage(slug) {
  return readJSON(join(PAGES_DIR, `${slug}.json`), null);
}

export function saveNote(slug, markdown) {
  ensureDirs();
  writeFileSync(join(NOTES_DIR, `${slug}.md`), markdown);
}
export function readAllNotes() {
  ensureDirs();
  const files = existsSync(NOTES_DIR)
    ? readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md"))
    : [];
  return files
    .map((f) => readFileSync(join(NOTES_DIR, f), "utf8"))
    .join("\n\n---\n\n");
}

export function saveTasks(tasks) {
  ensureDirs();
  writeJSON(TASKS, tasks);
}
export function readTasks() {
  return readJSON(TASKS, []);
}
export function saveSolution(id, markdown) {
  ensureDirs();
  writeFileSync(join(SOLUTIONS_DIR, `${id}.md`), markdown);
}
