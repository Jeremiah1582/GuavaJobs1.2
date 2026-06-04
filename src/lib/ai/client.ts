const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 60_000;
const OPENAI_API_BASE = "https://api.openai.com/v1";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: "json_object" | "text";
  timeoutMs?: number;
};

export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MISSING_API_KEY"
      | "INVALID_API_KEY"
      | "TIMEOUT"
      | "MODERATION"
      | "PROVIDER_ERROR",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiClientError";
  }
}

function isOpenRouterKey(key: string): boolean {
  return key.startsWith("sk-or-");
}

function getApiKey(): string {
  const key =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new AiClientError(
      "AI provider is not configured. Set OPENAI_API_KEY (OpenAI) or OPENROUTER_API_KEY (OpenRouter).",
      "MISSING_API_KEY",
    );
  }
  return key;
}

function getApiBaseUrl(apiKey: string): string {
  const explicit =
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.OPENAI_API_BASE?.trim() ||
    process.env.OPENROUTER_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (isOpenRouterKey(apiKey) || process.env.OPENROUTER_API_KEY?.trim()) {
    return OPENROUTER_API_BASE;
  }
  return OPENAI_API_BASE;
}

function getChatCompletionsUrl(apiKey: string): string {
  return `${getApiBaseUrl(apiKey)}/chat/completions`;
}

function buildRequestHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (!getApiBaseUrl(apiKey).includes("openrouter")) {
    return headers;
  }
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (referer) {
    headers["HTTP-Referer"] = referer;
  }
  headers["X-Title"] =
    process.env.OPENROUTER_APP_NAME?.trim() || "GuavaJobs";
  return headers;
}

function getModel(override?: string): string {
  return override?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

async function fetchCompletionOnce(
  options: ChatCompletionOptions,
): Promise<string> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getChatCompletionsUrl(apiKey), {
      method: "POST",
      headers: buildRequestHeaders(apiKey),
      body: JSON.stringify({
        model: getModel(options.model),
        temperature: options.temperature ?? 0.4,
        messages: options.messages,
        response_format:
          options.responseFormat === "json_object"
            ? { type: "json_object" }
            : undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 401 || response.status === 403) {
        const viaOpenRouter = getApiBaseUrl(apiKey).includes("openrouter");
        throw new AiClientError(
          viaOpenRouter
            ? "OpenRouter rejected the API key (check OPENROUTER_API_KEY or OPENAI_API_KEY)"
            : "OpenAI rejected the API key — use a platform.openai.com key, or an sk-or-v1 OpenRouter key (routed automatically)",
          "INVALID_API_KEY",
          response.status,
        );
      }
      if (response.status === 429 || response.status >= 500) {
        throw new AiClientError(
          "AI provider temporarily unavailable",
          "PROVIDER_ERROR",
          response.status,
        );
      }
      if (response.status === 400 && body.includes("content_policy")) {
        throw new AiClientError(
          "Content could not be generated due to moderation rules",
          "MODERATION",
          400,
        );
      }
      throw new AiClientError(
        `AI provider error (${response.status})`,
        "PROVIDER_ERROR",
        response.status,
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiClientError("AI provider returned empty content", "PROVIDER_ERROR");
    }
    return content;
  } catch (error) {
    if (error instanceof AiClientError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiClientError("AI request timed out", "TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Server-only OpenAI chat completion with one retry on transient failures. */
export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
  try {
    return await fetchCompletionOnce(options);
  } catch (error) {
    const retryable =
      error instanceof AiClientError &&
      (error.code === "TIMEOUT" || error.code === "PROVIDER_ERROR");
    if (!retryable) throw error;
    return fetchCompletionOnce(options);
  }
}
