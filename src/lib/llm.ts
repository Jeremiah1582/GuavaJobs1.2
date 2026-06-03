// src/lib/llm.ts — OpenRouter (OpenAI-compatible) chat completions

const OPENROUTER_BASE =
  process.env.OPENROUTER_BASE_URL?.replace(/\/$/, "") ??
  "https://openrouter.ai/api/v1";

export const MODEL_FAST =
  process.env.OPENROUTER_MODEL_FAST ?? "meta-llama/llama-3.1-8b-instruct";
export const MODEL_SMART =
  process.env.OPENROUTER_MODEL_SMART ?? "meta-llama/llama-3.3-70b-instruct";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getApiKey(): string {
  const key =
    process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      "Missing OPENROUTER_API_KEY or OPENAI_API_KEY in environment.",
    );
  }
  return key.trim();
}

function openRouterHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer":
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      "http://localhost:3000",
    "X-Title": "InternHunt",
  };
}

type CompletionOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
};

async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ choices: Array<{ delta?: { content?: string } }> }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        yield JSON.parse(data);
      } catch {
        /* skip malformed chunks */
      }
    }
  }
}

async function createCompletion(options: CompletionOptions) {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText}`);
  }

  if (options.stream) {
    if (!res.body) throw new Error("OpenRouter returned empty stream");
    const stream = parseSSEStream(res.body);
    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          yield chunk;
        }
      },
    };
  }

  return res.json() as Promise<{
    choices: Array<{ message?: { content?: string } }>;
  }>;
}

export const llm = {
  chat: {
    completions: {
      create: createCompletion,
    },
  },
};

export async function complete(
  userPrompt: string,
  systemPrompt?: string,
  temperature = 0.3,
  model = MODEL_SMART,
  maxTokens = 2048,
): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = (await llm.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  })) as { choices: Array<{ message?: { content?: string } }> };

  return res.choices[0]?.message?.content ?? "";
}

export function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
