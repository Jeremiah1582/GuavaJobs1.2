import { lookup } from "node:dns/promises";

import { ProfileUrlImportError } from "./errors";

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

const BLOCKED_DOMAINS = [
  "linkedin.com",
  "www.linkedin.com",
  "lnkd.in",
];

export function parseAndValidateImportUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new ProfileUrlImportError(
      "Invalid URL format",
      "INVALID_URL",
      400,
      "Please enter a valid URL (e.g. https://yoursite.com or https://yoursite.com/cv).",
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ProfileUrlImportError(
      "Only http and https URLs are supported",
      "INVALID_URL",
      400,
      "Only public http(s) links are supported.",
    );
  }

  if (parsed.username || parsed.password) {
    throw new ProfileUrlImportError(
      "URLs with credentials are not allowed",
      "INVALID_URL",
      400,
      "Please use a public page URL without login details in the link.",
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    throw new ProfileUrlImportError(
      "LinkedIn URLs cannot be imported automatically",
      "BLOCKED_HOST",
      400,
      "LinkedIn blocks automated imports. Paste your CV text below, or use a personal portfolio URL.",
    );
  }

  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
    throw new ProfileUrlImportError(
      "Private or local URLs are not allowed",
      "BLOCKED_HOST",
      400,
      "Please use a public website URL.",
    );
  }

  return parsed;
}

export async function assertPublicResolvableHost(url: URL): Promise<void> {
  const host = url.hostname;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
      throw new ProfileUrlImportError(
        "Private IP addresses are not allowed",
        "BLOCKED_HOST",
      );
    }
    return;
  }

  try {
    const records = await lookup(host, { all: true });
    for (const record of records) {
      const addr = record.address;
      if (BLOCKED_HOST_PATTERNS.some((re) => re.test(addr))) {
        throw new ProfileUrlImportError(
          "URL resolves to a private network address",
          "BLOCKED_HOST",
          400,
          "That URL points to a private network. Use a public portfolio link.",
        );
      }
    }
  } catch (error) {
    if (error instanceof ProfileUrlImportError) throw error;
    throw new ProfileUrlImportError(
      `Could not resolve host: ${host}`,
      "FETCH_FAILED",
      400,
      "We could not reach that website. Check the URL and try again.",
    );
  }
}
