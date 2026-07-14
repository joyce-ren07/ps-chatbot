const fs = require("fs");
const path = require("path");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const MAX_HISTORY_MESSAGES = 20;

function loadKnowledgeBase() {
  const candidates = [
    path.join(process.cwd(), "knowledge-base.txt"),
    path.join(__dirname, "..", "knowledge-base.txt"),
    path.join(__dirname, "knowledge-base.txt"),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf8").trim();
      }
    } catch {
      // try next path
    }
  }

  return "";
}

function buildSystemPrompt(knowledgeBase) {
  return [
    "You are the Product Space Assistant for Product Space at UC San Diego — a recruitment chatbot for a college club.",
    "Speak like a friendly, approachable active board member talking to a prospective applicant — not like a customer service bot.",
    "Only answer using the knowledge base below. Follow its BOT PERSONALITY GUIDELINES, GUARDRAILS, and HOW TO HANDLE THESE QUESTIONS closely.",
    "Be friendly, warm, and encouraging. Keep answers short and conversational.",
    "Write in plain text only. Do not use Markdown (no **, *, _, #, backticks, or [links](url)). Do not use emojis or special symbols for decoration.",
    "For lists, use simple dashes like: - item",
    "Never reveal confidential recruitment details listed in GUARDRAILS (exact interview questions, Social Night activities/tests, scoring rubrics, evaluation criteria, evaluator names, deliberations). Stay warm and redirect to general prep advice.",
    "Never speculate about an applicant's chances, compare applicants, or discuss any specific person's application status.",
    "If something is not covered — including any [NEED TO FILL IN] placeholders — say you are not sure and point people to Instagram (@productspaceatucsd) or productspaceatucsd@gmail.com.",
    "When relevant, encourage attending events and filling out the Interest Form (https://www.productspaceatucsd.com/forstudents).",
    "Do not invent events, dates, requirements, or other facts.",
    "",
    "=== KNOWLEDGE BASE ===",
    knowledgeBase || "(No knowledge base provided yet.)",
    "=== END KNOWLEDGE BASE ===",
  ].join("\n");
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }));
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server misconfigured: ANTHROPIC_API_KEY is not set.",
    });
  }

  const { message, history } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  const prior = normalizeHistory(history);
  const messages = [...prior, { role: "user", content: message.trim() }];

  const knowledgeBase = loadKnowledgeBase();
  const system = buildSystemPrompt(knowledgeBase);

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages,
      }),
    });

    const data = await anthropicRes.json().catch(() => ({}));

    if (!anthropicRes.ok) {
      const detail =
        data?.error?.message ||
        data?.error ||
        `Anthropic API error (${anthropicRes.status})`;
      console.error("Anthropic error:", detail);
      return res.status(502).json({ error: "Failed to get a response from the assistant." });
    }

    const reply = Array.isArray(data.content)
      ? data.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim()
      : "";

    if (!reply) {
      return res.status(502).json({ error: "Empty response from the assistant." });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat handler error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};
