export function normalizeKeyword(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function lightStem(word: string): string {
  if (word.length <= 4) return word;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

function tokenize(text: string): string[] {
  return normalizeKeyword(text)
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length >= 2);
}

function stemsMatch(textTokens: string[], keyword: string): boolean {
  const kw = normalizeKeyword(keyword);
  if (!kw) return false;

  const kwTokens = kw.split(/\s+/).map(lightStem);
  if (kwTokens.length === 1) {
    const stem = kwTokens[0]!;
    return textTokens.some(
      (token) => token === stem || token.includes(stem) || stem.includes(token),
    );
  }

  const haystack = textTokens.join(" ");
  if (haystack.includes(kw)) return true;

  return kwTokens.every((part) =>
    textTokens.some(
      (token) => token === part || token.includes(part) || part.includes(token),
    ),
  );
}

export function textContainsKeyword(text: string, keyword: string): boolean {
  const normalizedText = normalizeKeyword(text);
  const normalizedKw = normalizeKeyword(keyword);
  if (!normalizedKw) return false;
  if (normalizedText.includes(normalizedKw)) return true;
  return stemsMatch(tokenize(text), keyword);
}

export type KeywordMatchResult = {
  present: string[];
  missing: string[];
  score: number;
};

export function scoreKeywordMatch(
  text: string,
  required: string[],
  preferred: string[] = [],
): KeywordMatchResult {
  const trimmed = text.trim();
  const requiredUnique = [...new Set(required.map((k) => k.trim()).filter(Boolean))];
  const preferredUnique = [...new Set(preferred.map((k) => k.trim()).filter(Boolean))];

  const present: string[] = [];
  const missing: string[] = [];

  for (const keyword of requiredUnique) {
    if (trimmed && textContainsKeyword(trimmed, keyword)) {
      present.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  for (const keyword of preferredUnique) {
    if (trimmed && textContainsKeyword(trimmed, keyword)) {
      if (!present.includes(keyword)) present.push(keyword);
    } else if (!missing.includes(keyword)) {
      missing.push(keyword);
    }
  }

  const requiredHits = requiredUnique.filter((k) => present.includes(k)).length;
  const preferredHits = preferredUnique.filter((k) => present.includes(k)).length;
  const totalWeight = requiredUnique.length + preferredUnique.length * 0.5;

  const score =
    !trimmed || totalWeight === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (100 * (requiredHits + preferredHits * 0.5)) / totalWeight,
          ),
        );

  return { present, missing, score };
}

export function computeOverallScore(
  letterScore: number | null,
  cvScore: number | null,
): number {
  if (letterScore !== null && cvScore !== null) {
    return Math.round(0.5 * letterScore + 0.5 * cvScore);
  }
  if (letterScore !== null) return letterScore;
  if (cvScore !== null) return cvScore;
  return 0;
}
