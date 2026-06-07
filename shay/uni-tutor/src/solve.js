import { readTasks, readAllNotes, saveSolution } from "./lib/store.js";
import { ask } from "./lib/llm.js";

const SOLVE_SYSTEM =
  "You are an expert tutor. Produce a complete, correct, worked solution to " +
  "the student's task, grounded in the provided course material plus standard " +
  "knowledge of the subject. Explain each step so the student learns the " +
  "method — not just the final answer. Use clear Markdown.";

async function main() {
  const tasks = readTasks();
  if (!tasks.length) {
    console.error("No tasks found. Run `npm run learn` first.");
    process.exit(1);
  }

  const arg = process.argv[2];
  if (!arg || arg === "list") {
    console.log("Tasks:");
    for (const t of tasks) console.log(`  ${t.id}. ${t.title}`);
    console.log("\nSolve one with:  npm run solve -- <id>   (or 'all')");
    return;
  }

  const targets = arg === "all" ? tasks : tasks.filter((t) => t.id === arg);
  if (!targets.length) {
    console.error(`No task with id "${arg}". Run \`npm run solve -- list\`.`);
    process.exit(1);
  }

  const material = readAllNotes();
  for (const task of targets) {
    console.log(`\n=== Task ${task.id}: ${task.title} ===\n`);
    const solution = await ask({
      system: SOLVE_SYSTEM,
      material,
      messages: [{ role: "user", content: `Task: ${task.title}\n\n${task.description}` }],
      effort: "high",
      maxTokens: 16000,
      stream: true,
    });
    saveSolution(task.id, `# ${task.title}\n\n${solution}`);
    console.log(`\n\n(saved to data/solutions/${task.id}.md)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
