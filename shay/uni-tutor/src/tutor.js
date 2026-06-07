import { createInterface } from "node:readline";
import { ask } from "./lib/llm.js";
import { readAllNotes } from "./lib/store.js";

const TUTOR_SYSTEM =
  "You are a patient, rigorous personal tutor for the student's university " +
  "course. Ground answers in the provided course material when relevant; if " +
  "it doesn't cover something, say so and use general knowledge. Teach " +
  "actively — explain clearly, give examples, and check understanding with a " +
  "question when useful. Keep responses focused.";

async function main() {
  const material = readAllNotes();
  if (!material) {
    console.warn(
      "No notes yet — run `npm run crawl` then `npm run learn` to ground the " +
      "tutor in your course. Continuing with general knowledge for now.\n"
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const messages = [];

  console.log("Tutor ready. Ask anything. Type /quiz for a question, /exit to quit.\n");

  const turn = () =>
    rl.question("you> ", async (line) => {
      const input = line.trim();
      if (input === "/exit" || input === "/quit") {
        rl.close();
        return;
      }
      const content =
        input === "/quiz"
          ? "Quiz me: ask one focused question about the course material, then wait for my answer."
          : input;
      if (!content) {
        turn();
        return;
      }

      messages.push({ role: "user", content });
      process.stdout.write("\ntutor> ");
      try {
        const answer = await ask({
          system: TUTOR_SYSTEM,
          material,
          messages,
          effort: "high",
          maxTokens: 8000,
          stream: true,
        });
        messages.push({ role: "assistant", content: answer });
      } catch (e) {
        console.error(`\n[error: ${e.message}]`);
        messages.pop();
      }
      process.stdout.write("\n\n");
      turn();
    });

  turn();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
