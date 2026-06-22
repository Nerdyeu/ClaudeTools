// ClaudeTools — serveur
//
// Petit backend Express qui :
//   - sert l'interface (public/)
//   - expose le catalogue d'outils (sans le prompt système)
//   - relaie le chat vers l'API Claude en streaming (SSE)
//
// La clé API ne quitte JAMAIS le serveur : le navigateur parle à /api/chat,
// le serveur parle à Anthropic.

import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import { tools, publicMeta, getTool } from "./tools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 8192;

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const client = new Anthropic(); // lit ANTHROPIC_API_KEY dans l'environnement

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "public")));

// --- Catalogue --------------------------------------------------------------

app.get("/api/tools", (_req, res) => {
  res.json({ tools: tools.map(publicMeta), ready: hasKey });
});

app.get("/api/tools/:id/prompt", (req, res) => {
  const tool = getTool(req.params.id);
  if (!tool) return res.status(404).json({ error: "Outil inconnu." });
  res.json({ prompt: tool.systemPrompt });
});

// --- Chat (streaming SSE) ---------------------------------------------------

app.post("/api/chat", async (req, res) => {
  const { toolId, messages } = req.body || {};

  const tool = getTool(toolId);
  if (!tool) return res.status(400).json({ error: "Outil inconnu." });

  if (!hasKey) {
    return res
      .status(503)
      .json({ error: "Clé API absente. Définissez ANTHROPIC_API_KEY puis redémarrez." });
  }

  const cleanMessages = Array.isArray(messages)
    ? messages
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim() !== "",
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  if (cleanMessages.length === 0 || cleanMessages[0].role !== "user") {
    return res.status(400).json({ error: "Le premier message doit venir de l'utilisateur." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: tool.systemPrompt,
    messages: cleanMessages,
  });

  const onClose = () => {
    try {
      stream.abort();
    } catch {
      /* déjà terminé */
    }
  };
  req.on("close", onClose);

  try {
    for await (const event of stream) {
      if (event.type !== "content_block_delta") continue;
      if (event.delta.type === "text_delta") {
        send({ type: "text", text: event.delta.text });
      } else if (event.delta.type === "thinking_delta") {
        send({ type: "thinking", text: event.delta.thinking });
      }
    }
    const final = await stream.finalMessage();
    send({ type: "done", stop_reason: final.stop_reason, usage: final.usage });
  } catch (err) {
    if (err?.name !== "AbortError") {
      send({ type: "error", error: err?.message || "Erreur pendant la génération." });
    }
  } finally {
    req.off("close", onClose);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n  ClaudeTools → http://localhost:${PORT}`);
  console.log(`  Modèle : ${MODEL}`);
  if (!hasKey) {
    console.log(
      "\n  ⚠  ANTHROPIC_API_KEY absente — l'interface s'affiche mais le chat renverra une erreur.",
    );
    console.log("     Copiez app/.env.example en app/.env, ajoutez votre clé, puis `npm run dev`.\n");
  } else {
    console.log("");
  }
});
