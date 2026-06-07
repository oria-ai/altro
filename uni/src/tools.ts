import type Anthropic from "@anthropic-ai/sdk";

/**
 * Client-side tools the agent can call.
 *
 * To add a tool: append a `ToolDef` to `toolDefs` below. The JSON schema is
 * advertised to the model and the handler runs locally when the model calls
 * it. Keep handlers side-effect-light, or gate destructive actions behind an
 * approval step before wiring them in.
 */
export type ToolHandler = (input: any) => Promise<string> | string;

interface ToolDef {
  spec: Anthropic.Tool;
  handler: ToolHandler;
}

const toolDefs: ToolDef[] = [
  {
    spec: {
      name: "get_current_time",
      description:
        "Get the current date and time. Call this whenever the user asks about the current time, the date, or what 'now' is.",
      input_schema: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description:
              "IANA timezone name, e.g. 'America/New_York'. Defaults to UTC.",
          },
        },
        required: [],
      },
    },
    handler: ({ timezone }: { timezone?: string }) => {
      const now = new Date();
      if (!timezone) return now.toISOString();
      try {
        return new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          dateStyle: "full",
          timeStyle: "long",
        }).format(now);
      } catch {
        return `Unknown timezone "${timezone}". Current UTC time is ${now.toISOString()}.`;
      }
    },
  },
];

export const tools: Anthropic.Tool[] = toolDefs.map((t) => t.spec);

const handlers = new Map<string, ToolHandler>(
  toolDefs.map((t) => [t.spec.name, t.handler]),
);

export async function runTool(name: string, input: unknown): Promise<string> {
  const handler = handlers.get(name);
  if (!handler) return `Error: unknown tool "${name}".`;
  try {
    return await handler(input);
  } catch (err) {
    return `Error running tool "${name}": ${(err as Error).message}`;
  }
}
