import Anthropic from "@anthropic-ai/sdk";
import { env } from "./config.js";
import { tools, runTool } from "./tools.js";
import type { StoredMessage } from "./supabase.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const DEFAULT_SYSTEM =
  "You are uni, a helpful and concise assistant. Use the available tools when " +
  "they would improve your answer; otherwise answer directly. Keep responses " +
  "focused and to the point.";

export interface AgentResult {
  reply: string;
  steps: number;
}

/**
 * Runs the agentic loop: the model may call tools, we execute them and feed
 * the results back, repeating until the model produces a final answer or we
 * hit the step ceiling.
 */
export async function runAgent(
  history: StoredMessage[],
  userMessage: string,
): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  let steps = 0;
  while (steps < env.MAX_AGENT_STEPS) {
    steps++;

    const response = await client.messages.create({
      model: env.MODEL,
      max_tokens: 16000,
      // Adaptive thinking lets the model decide how much to reason per turn.
      thinking: { type: "adaptive" },
      output_config: { effort: env.EFFORT },
      // The system prompt is stable across requests, so cache it.
      system: [
        {
          type: "text",
          text: env.SYSTEM_PROMPT ?? DEFAULT_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      // Preserve the full assistant turn (including any thinking + tool_use
      // blocks) before sending tool results back.
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await runTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Terminal turn — extract the text the user should see.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return { reply: text || "(no response)", steps };
  }

  return {
    reply: "I couldn't complete the request within the allotted number of steps.",
    steps,
  };
}
