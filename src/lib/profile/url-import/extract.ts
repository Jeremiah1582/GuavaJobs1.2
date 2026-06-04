import { AiClientError, chatCompletion } from "../../ai/client";
import { ProfileUrlImportError } from "./errors";
import { htmlToPlainText } from "./html-to-text";
import {
  normalizePageUrl,
  pathLabel,
  selectUrlsToFetch,
} from "./discover-routes";
import { normalizeAiProfile } from "./normalize";
import { assertPublicResolvableHost, parseAndValidateImportUrl } from "./url-security";
import type { ProfileUrlImportResult } from "../../validators/profile-import";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_CHARS_PER_PAGE = 8_000;
const MAX_TOTAL_CHARS = 28_000;

const PROFILE_IMPORT_SYSTEM_PROMPT = `You are a profile data extractor for job seekers. You receive plain text from one or more pages on the same personal website (portfolio, CV site, etc.). Pages may be labeled with their URL path (e.g. /about, /resume, /experience).

Merge information across all pages into a single profile. Prefer the most complete / recent detail when pages overlap.

Return JSON only with this shape:
{
  "name": "full name or null",
  "headline": "professional title / tagline or null",
  "summary": "professional summary or bio (1-4 sentences) or null",
  "location": "city/region/country for job search or null",
  "phone": "phone number as shown on site or null",
  "avatarUrl": "absolute URL to profile photo if visible or null",
  "websiteUrl": "personal site or portfolio URL if distinct from import URL or null",
  "address": {
    "addressLine1": "street line 1 or null",
    "addressLine2": "street line 2 or null",
    "city": "city or null",
    "region": "state/county/region or null",
    "postalCode": "postcode/ZIP or null",
    "country": "country name or ISO code or null"
  },
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "role": "job title",
      "company": "employer",
      "startDate": "e.g. Jan 2020 or null",
      "endDate": "e.g. Present or null",
      "bullets": ["achievement or responsibility"]
    }
  ],
  "education": [
    {
      "institution": "school name",
      "degree": "degree or null",
      "startDate": "string or null",
      "endDate": "string or null"
    }
  ],
  "quiz": {
    "roleType": "optional target role",
    "workMode": "remote" | "hybrid" | "onsite" | "flexible" (only if stated),
    "priorities": ["optional career priorities"]
  },
  "confidence": "high" | "medium" | "low"
}

Use "role" not "title". Use "bullets" not "highlights".
If data is sparse or ambiguous, set confidence to "low".
Empty arrays when nothing found. No markdown, no commentary.`;

export type ImportProfileFromUrlOptions = {
  /** Extra same-site paths or full URLs to include (e.g. "/experience", "/cv"). */
  additionalPaths?: string[];
};

async function fetchPageHtml(url: string): Promise<{ ok: boolean; html: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GuavaJobs/1.0; +https://guavajobs.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) {
      return { ok: false, html: "" };
    }
    const html = await response.text();
    return { ok: true, html };
  } catch {
    return { ok: false, html: "" };
  }
}

function buildCombinedCorpus(
  pages: { url: string; text: string }[],
): string {
  const sections: string[] = [];
  let total = 0;

  for (const page of pages) {
    const label = pathLabel(page.url);
    const chunk = page.text.slice(0, MAX_CHARS_PER_PAGE);
    const section = `--- Page: ${label} (${page.url}) ---\n${chunk}`;
    if (total + section.length > MAX_TOTAL_CHARS) {
      const remaining = MAX_TOTAL_CHARS - total;
      if (remaining > 200) {
        sections.push(section.slice(0, remaining));
      }
      break;
    }
    sections.push(section);
    total += section.length;
  }

  return sections.join("\n\n");
}

export async function importProfileFromUrl(
  rawUrl: string,
  options: ImportProfileFromUrlOptions = {},
): Promise<ProfileUrlImportResult> {
  const entry = parseAndValidateImportUrl(rawUrl);
  await assertPublicResolvableHost(entry);

  const first = await fetchPageHtml(entry.href);
  if (!first.ok && !first.html) {
    throw new ProfileUrlImportError(
      `Failed to fetch entry URL`,
      "FETCH_FAILED",
      400,
      "We could not load that page. Check the URL is public and try again.",
    );
  }

  const entryNorm = normalizePageUrl(entry);
  const urlsToTry = selectUrlsToFetch(
    entry,
    first.html,
    options.additionalPaths ?? [],
  );

  const pageResults: { url: string; ok: boolean; text: string }[] = [];

  const entryText = first.html ? htmlToPlainText(first.html) : "";
  pageResults.push({
    url: entryNorm,
    ok: first.ok && entryText.length >= 40,
    text: entryText,
  });

  const otherUrls = urlsToTry.filter((u) => normalizePageUrl(u) !== entryNorm);

  await Promise.all(
    otherUrls.map(async (pageUrl) => {
      const { ok, html } = await fetchPageHtml(pageUrl);
      const text = ok && html ? htmlToPlainText(html) : "";
      pageResults.push({ url: pageUrl, ok: ok && text.length >= 40, text });
    }),
  );

  const successfulPages = pageResults.filter((p) => p.ok);
  const pagesScanned = pageResults.map((p) => ({
    url: p.url,
    path: pathLabel(p.url),
    ok: p.ok,
  }));

  if (successfulPages.length === 0) {
    throw new ProfileUrlImportError(
      "No readable content on discovered pages",
      "CONTENT_TOO_SHORT",
      400,
      "We could not read enough text on that site. Try your CV page URL, or paste your CV text below.",
    );
  }

  const corpus = buildCombinedCorpus(successfulPages);
  if (corpus.length < 50) {
    throw new ProfileUrlImportError(
      "Extracted text too short",
      "CONTENT_TOO_SHORT",
      400,
      "The page did not contain enough profile text to import.",
    );
  }

  let rawAi: string;
  try {
    rawAi = await chatCompletion({
      messages: [
        { role: "system", content: PROFILE_IMPORT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract a unified job-seeker profile from these website pages:\n\n${corpus}`,
        },
      ],
      temperature: 0.15,
      responseFormat: "json_object",
      timeoutMs: 55_000,
    });
  } catch (error) {
    if (error instanceof AiClientError) {
      if (error.code === "MISSING_API_KEY") {
        throw new ProfileUrlImportError(
          error.message,
          "AI_UNAVAILABLE",
          503,
          "AI is not configured on the server. Add OPENAI_API_KEY or OPENROUTER_API_KEY to app/.env.local, restart the dev server, then try again.",
        );
      }
      if (error.code === "INVALID_API_KEY") {
        throw new ProfileUrlImportError(
          error.message,
          "AI_CONFIG_ERROR",
          503,
          "Your AI API key was rejected. Use an OpenAI key (sk-…) for OpenAI, or an OpenRouter key (sk-or-v1-…) — OpenRouter keys are detected automatically.",
        );
      }
      if (error.code === "TIMEOUT") {
        throw new ProfileUrlImportError(
          error.message,
          "TIMEOUT",
          408,
          "Analysis took too long. Try a single CV page URL or paste your CV text.",
        );
      }
      if (error.code === "PROVIDER_ERROR") {
        throw new ProfileUrlImportError(
          error.message,
          "AI_UNAVAILABLE",
          503,
          "The AI service is busy or down. Wait a moment and try again, or paste your CV text below.",
        );
      }
    }
    throw new ProfileUrlImportError(
      "AI extraction failed",
      "AI_PARSE_FAILED",
      503,
      "We could not analyze that site right now. Try again or paste your CV text.",
    );
  }

  let parsed: unknown;
  try {
    const cleaned = rawAi
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ProfileUrlImportError(
      "Invalid AI response",
      "AI_PARSE_FAILED",
      500,
      "We could not understand the page content. Try a different URL or paste your CV.",
    );
  }

  const result = normalizeAiProfile(parsed, pagesScanned);

  if (
    result.confidence === "low" &&
    !result.summary &&
    result.experience.length === 0 &&
    result.skills.length === 0
  ) {
    throw new ProfileUrlImportError(
      "Low confidence extraction",
      "CONTENT_TOO_SHORT",
      422,
      "We found very little profile information on that site. Try a direct link to your About or CV page, or paste your CV text below.",
    );
  }

  return result;
}
