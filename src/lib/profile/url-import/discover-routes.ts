/** Path segments commonly used for profile / CV content on personal sites. */
export const PROFILE_ROUTE_SEGMENTS = [
  "about",
  "about-me",
  "bio",
  "resume",
  "résumé",
  "cv",
  "curriculum-vitae",
  "experience",
  "work",
  "work-history",
  "employment",
  "career",
  "history",
  "education",
  "qualifications",
  "skills",
  "profile",
  "portfolio",
  "background",
  "projects",
] as const;

const PROFILE_PATH_RE = new RegExp(
  `/(?:${PROFILE_ROUTE_SEGMENTS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?:/|$)`,
  "i",
);

const MAX_DISCOVERED_URLS = 6;

export function normalizePageUrl(url: URL | string): string {
  const parsed = typeof url === "string" ? new URL(url) : url;
  const copy = new URL(parsed.href);
  copy.hash = "";
  copy.search = "";
  if (copy.pathname.length > 1 && copy.pathname.endsWith("/")) {
    copy.pathname = copy.pathname.slice(0, -1);
  }
  return copy.href;
}

function isSameSite(candidate: URL, origin: URL): boolean {
  return candidate.origin === origin.origin;
}

function scoreProfilePath(pathname: string): number {
  const lower = pathname.toLowerCase();
  let score = 0;
  for (const segment of PROFILE_ROUTE_SEGMENTS) {
    if (lower.includes(`/${segment}`) || lower.endsWith(`/${segment}`)) {
      score += 10;
    }
  }
  if (PROFILE_PATH_RE.test(pathname)) score += 5;
  if (pathname === "/" || pathname === "") score += 1;
  return score;
}

function directoryBase(pathname: string): string {
  if (pathname === "/" || pathname === "") return "/";
  const trimmed = pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const lastSlash = trimmed.lastIndexOf("/");
  if (lastSlash <= 0) return "/";
  return `${trimmed.slice(0, lastSlash + 1)}`;
}

/** Extract same-origin links from HTML that look like profile sections. */
export function extractProfileLinksFromHtml(
  html: string,
  origin: URL,
): string[] {
  const found = new Set<string>();
  const hrefRe = /\shref\s*=\s*["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    try {
      const resolved = new URL(href, origin);
      if (!isSameSite(resolved, origin)) continue;
      if (!PROFILE_PATH_RE.test(resolved.pathname)) continue;
      found.add(normalizePageUrl(resolved));
    } catch {
      // ignore bad href
    }
  }
  return [...found];
}

/** Build candidate URLs from entry path + common profile route segments. */
export function buildCandidateProfileUrls(entry: URL): string[] {
  const candidates = new Set<string>();
  candidates.add(normalizePageUrl(entry));

  const bases = new Set<string>(["/"]);
  const dir = directoryBase(entry.pathname);
  if (dir !== "/") bases.add(dir);

  for (const basePath of bases) {
    for (const segment of PROFILE_ROUTE_SEGMENTS) {
      const path =
        basePath === "/"
          ? `/${segment}`
          : `${basePath.replace(/\/$/, "")}/${segment}`;
      try {
        candidates.add(normalizePageUrl(new URL(path, entry)));
      } catch {
        // skip
      }
    }
  }

  return [...candidates];
}

/**
 * Rank and cap URLs to fetch: always include entry URL, then nav links, then probes.
 */
export function selectUrlsToFetch(
  entry: URL,
  homeHtml: string,
  extraPaths: string[] = [],
): string[] {
  const entryNorm = normalizePageUrl(entry);
  const scored = new Map<string, number>();

  scored.set(entryNorm, 1000);

  for (const link of extractProfileLinksFromHtml(homeHtml, entry)) {
    const prev = scored.get(link) ?? 0;
    scored.set(link, Math.max(prev, 50 + scoreProfilePath(new URL(link).pathname)));
  }

  for (const candidate of buildCandidateProfileUrls(entry)) {
    const prev = scored.get(candidate) ?? 0;
    scored.set(
      candidate,
      Math.max(prev, 20 + scoreProfilePath(new URL(candidate).pathname)),
    );
  }

  for (const path of extraPaths) {
    try {
      const resolved = new URL(path.trim(), entry);
      if (!isSameSite(resolved, entry)) continue;
      const norm = normalizePageUrl(resolved);
      scored.set(norm, 200);
    } catch {
      // skip invalid extra path
    }
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DISCOVERED_URLS)
    .map(([url]) => url);
}

export function pathLabel(url: string): string {
  try {
    const path = new URL(url).pathname || "/";
    return path === "/" ? "Home" : path;
  } catch {
    return url;
  }
}
