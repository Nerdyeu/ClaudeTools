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
const DEMO = !hasKey; // sans clé → réponses simulées, pour voir l'interface
// Le client n'est créé qu'avec une clé (son constructeur échoue sinon).
const client = hasKey ? new Anthropic() : null;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "public")));

// --- Catalogue --------------------------------------------------------------

app.get("/api/tools", (_req, res) => {
  res.json({ tools: tools.map(publicMeta), mode: DEMO ? "demo" : "live" });
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

  // Pas de clé → on simule une réponse pour montrer l'interface.
  if (DEMO) {
    return streamDemo(req, res, send, cleanMessages[cleanMessages.length - 1].content);
  }

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: tool.systemPrompt,
    messages: cleanMessages,
  });

  // Détection de déconnexion client : on écoute `res` (et non `req`, dont le
  // 'close' se déclenche dès que le corps de la requête est lu).
  const onClose = () => {
    try {
      stream.abort();
    } catch {
      /* déjà terminé */
    }
  };
  res.on("close", onClose);

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
    res.off("close", onClose);
    res.end();
  }
});

// --- Mode démo (sans clé API) ----------------------------------------------

function demoReplyFor(userText) {
  const t = userText.length > 90 ? userText.slice(0, 87) + "…" : userText;
  return [
    "**🔌 Mode démo — sans clé API.** Réponse simulée, juste pour te montrer l'interface : le texte qui s'écrit en direct, la mise en forme, le fil de conversation. Ajoute une clé `ANTHROPIC_API_KEY` pour parler au vrai modèle.",
    "",
    `Tu as écrit : « ${t} »`,
    "",
    "### Ce que ferait le vrai Studio",
    "Il cadrerait l'intention avant de produire, avec quelques questions ciblées :",
    "- **Objectif** — notoriété, vente, ou éducation ?",
    "- **Audience** — qui doit accrocher dans les 3 premières secondes ?",
    "- **Ton & format** — court et cash, ou narratif ?",
    "",
    "Puis il livrerait un résultat structuré et prêt à copier — souvent en **Option A / B / C** — et terminerait par une ligne **« Pour affiner : »** listant les 2-3 leviers les plus utiles.",
    "",
    "*(Fin de la démo. Branche ta clé API et relance pour de vraies réponses.)*",
  ].join("\n");
}

async function streamDemo(_req, res, send, userText) {
  const tokens = demoReplyFor(userText).match(/\s+|\S+/g) || [];
  let aborted = false;
  const onClose = () => {
    aborted = true;
  };
  res.on("close", onClose);
  try {
    for (const tok of tokens) {
      if (aborted) return;
      send({ type: "text", text: tok });
      await new Promise((r) => setTimeout(r, 16));
    }
    if (!aborted) send({ type: "done", demo: true });
  } finally {
    res.off("close", onClose);
    res.end();
  }
}

app.listen(PORT, () => {
  console.log(`\n  ClaudeTools → http://localhost:${PORT}`);
  if (DEMO) {
    console.log("  Mode : DÉMO (sans clé API) — le chat renvoie des réponses simulées.");
    console.log("  Pour de vraies réponses : copiez app/.env.example en app/.env,");
    console.log("  ajoutez ANTHROPIC_API_KEY, puis relancez `npm run dev`.\n");
  } else {
    console.log(`  Mode : LIVE — modèle ${MODEL}\n`);
  }
});
