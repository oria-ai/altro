import express from "express";
import { env, supabaseConfigured } from "./config.js";
import { runAgent } from "./agent.js";
import { ensureConversation, loadHistory, saveMessage } from "./supabase.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check — used by Railway's healthcheckPath.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    model: env.MODEL,
    supabase: supabaseConfigured ? "connected" : "disabled",
    uptime: process.uptime(),
  });
});

// Chat endpoint. Body: { message: string, conversationId?: string }
app.post("/chat", async (req, res) => {
  const { message, conversationId } = req.body ?? {};

  if (typeof message !== "string" || message.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Body must include a non-empty 'message' string." });
  }

  try {
    const convId = await ensureConversation(conversationId);
    const history = await loadHistory(convId);

    await saveMessage(convId, { role: "user", content: message });
    const { reply, steps } = await runAgent(history, message);
    await saveMessage(convId, { role: "assistant", content: reply });

    res.json({ conversationId: convId, reply, steps });
  } catch (err) {
    console.error("[/chat] error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const server = app.listen(env.PORT, () => {
  console.log(
    `uni listening on :${env.PORT} ` +
      `(model: ${env.MODEL}, supabase: ${supabaseConfigured ? "on" : "off"})`,
  );
});

// Graceful shutdown so Railway can roll deploys cleanly.
function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
