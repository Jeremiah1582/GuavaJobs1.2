import "server-only"

import { AiClientError, chatCompletion } from "@/lib/ai/client"
import { ProfileUrlImportError } from "@/lib/profile/url-import/errors"
import { normalizeAiProfile } from "@/lib/profile/url-import/normalize"
import type { ProfileUrlImportResult } from "@/lib/validators/profile-import"

const MAX_CV_CHARS = 28_000

const CV_IMPORT_SYSTEM_PROMPT = `You are a profile data extractor for job seekers. You receive plain text from a resume or CV document.

Return JSON only with this shape:
{
  "name": "full name or null",
  "headline": "professional title / tagline or null",
  "summary": "professional summary or bio (1-4 sentences) or null",
  "location": "city/region/country or null",
  "phone": "phone number or null",
  "avatarUrl": null,
  "websiteUrl": "personal site or portfolio URL if present or null",
  "address": {
    "addressLine1": "street line 1 or null",
    "addressLine2": "street line 2 or null",
    "city": "city or null",
    "region": "state/county/region or null",
    "postalCode": "postcode/ZIP or null",
    "country": "country or null"
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
If data is sparse, set confidence to "low".
Empty arrays when nothing found. No markdown, no commentary.`

export async function importProfileFromCvText(
  rawText: string,
  sourceLabel: string,
): Promise<ProfileUrlImportResult> {
  const corpus = rawText.trim().slice(0, MAX_CV_CHARS)
  if (corpus.length < 80) {
    throw new ProfileUrlImportError(
      "CV text too short",
      "CONTENT_TOO_SHORT",
      400,
      "We could not read enough text from that file. Try a text-based PDF or paste your CV below.",
    )
  }

  let rawAi: string
  try {
    rawAi = await chatCompletion({
      messages: [
        { role: "system", content: CV_IMPORT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract a job-seeker profile from this CV:\n\n${corpus}`,
        },
      ],
      temperature: 0.15,
      responseFormat: "json_object",
      timeoutMs: 55_000,
    })
  } catch (error) {
    if (error instanceof AiClientError) {
      if (error.code === "MISSING_API_KEY") {
        throw new ProfileUrlImportError(
          error.message,
          "AI_UNAVAILABLE",
          503,
          "AI is not configured. Add OPENAI_API_KEY or OPENROUTER_API_KEY, then try again.",
        )
      }
      if (error.code === "TIMEOUT") {
        throw new ProfileUrlImportError(
          error.message,
          "TIMEOUT",
          408,
          "Analysis took too long. Try a shorter file or paste your CV text.",
        )
      }
    }
    throw new ProfileUrlImportError(
      "AI extraction failed",
      "AI_PARSE_FAILED",
      503,
      "We could not analyze that CV right now. Try again or paste your CV text.",
    )
  }

  let parsed: unknown
  try {
    const cleaned = rawAi
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new ProfileUrlImportError(
      "Invalid AI response",
      "AI_PARSE_FAILED",
      500,
      "We could not understand the CV content. Try again or paste your CV text.",
    )
  }

  const pagesScanned: ProfileUrlImportResult["pagesScanned"] = [
    {
      url: "https://internhunt.local/cv-upload",
      path: sourceLabel,
      ok: true,
    },
  ]

  const result = normalizeAiProfile(parsed, pagesScanned)

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
      "We found very little profile information in that file. Try another export or paste your CV text.",
    )
  }

  return result
}
