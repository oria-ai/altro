import { listPages, readPage, saveNote, saveTasks, readAllNotes } from "./lib/store.js";
import { ask, askJSON } from "./lib/llm.js";

const NOTES_SYSTEM =
  "You are a study assistant. From the course page below, write concise, " +
  "well-structured Markdown study notes: key concepts, definitions, and any " +
  "worked examples. Ignore navigation/boilerplate text. Be faithful to the " +
  "source — do not invent material that isn't there.";

const TASKS_SYSTEM =
  "You extract graded work from course material. Identify every assignment, " +
  "exercise, problem set, or task a student must complete. For each, give a " +
  "short title and a self-contained description (include the actual question " +
  "or requirement). If there are none, return an empty list.";

const TASKS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "description"],
      },
    },
  },
  required: ["tasks"],
};

async function main() {
  const pages = listPages();
  if (!pages.length) {
    console.error("No pages found. Run `npm run crawl` first.");
    process.exit(1);
  }

  console.log(`Writing notes for ${pages.length} page(s)...`);
  for (const p of pages) {
    const page = readPage(p.slug);
    if (!page || !page.text) continue;
    const note = await ask({
      system: NOTES_SYSTEM,
      messages: [
        { role: "user", content: `Page title: ${page.title}\nURL: ${page.url}\n\n${page.text}` },
      ],
      effort: "high",
      maxTokens: 8000,
    });
    saveNote(p.slug, `# ${page.title || p.url}\n\nSource: ${page.url}\n\n${note}`);
    console.log(`  notes: ${page.title || p.url}`);
  }

  console.log("Extracting tasks across all notes...");
  const material = readAllNotes();
  const result = await askJSON({
    system: TASKS_SYSTEM,
    material,
    messages: [
      { role: "user", content: "Extract every assignment, exercise, or task from the course material above." },
    ],
    schema: TASKS_SCHEMA,
  });
  const tasks = (result.tasks || []).map((t, i) => ({ id: String(i + 1), ...t }));
  saveTasks(tasks);

  console.log(
    `\nDone. Notes in data/notes/, ${tasks.length} task(s) in data/tasks.json.\n` +
    "Next: npm run tutor   (or: npm run solve -- list)"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
