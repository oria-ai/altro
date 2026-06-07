import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../config.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "Set ANTHROPIC_API_KEY in your environment first.\n" +
    "Get a key at https://console.anthropic.com/ then:\n" +
    "  export ANTHROPIC_API_KEY=sk-ant-...\n"
  );
  process.exit(1);
}

const client = new Anthropic();

// Course material goes in a cached system block so repeated calls reuse it.
function buildSystem(system, material) {
  const blocks = [];
  if (system) blocks.push({ type: "text", text: system });
  if (material) {
    blocks.push({
      type: "text",
      text: `--- COURSE MATERIAL ---\n${material}`,
      cache_control: { type: "ephemeral" },
    });
  }
  return blocks;
}

export async function ask({
  system, material, messages, effort = "high", maxTokens = 16000, stream = false,
}) {
  const systemBlocks = buildSystem(system, material);
  const s = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    output_config: { effort },
    ...(systemBlocks.length ? { system: systemBlocks } : {}),
    messages,
  });
  if (stream) s.on("text", (t) => process.stdout.write(t));
  const msg = await s.finalMessage();
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function askJSON({ system, material, messages, schema, maxTokens = 8000 }) {
  const systemBlocks = buildSystem(system, material);
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    output_config: { format: { type: "json_schema", schema } },
    ...(systemBlocks.length ? { system: systemBlocks } : {}),
    messages,
  });
  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from the model, got:\n${text.slice(0, 500)}`);
  }
}
