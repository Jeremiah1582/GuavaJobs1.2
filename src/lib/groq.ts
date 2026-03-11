// src/lib/groq.ts
import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// llama-3.1-8b-instant: faster + cheaper on free tier for bulk tasks
// llama-3.3-70b-versatile: smarter, for single high-value tasks
export const MODEL_FAST  = "llama-3.1-8b-instant";     // bulk scoring, cheap ops
export const MODEL_SMART = "llama-3.3-70b-versatile";  // resume analysis, cover letters, chat

export async function complete(
  userPrompt: string,
  systemPrompt?: string,
  temperature = 0.3,
  model = MODEL_SMART,
  maxTokens = 2048,
): Promise<string> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await groq.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  return res.choices[0]?.message?.content ?? "";
}

export function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}