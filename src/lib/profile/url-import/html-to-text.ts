export function extractJsonLdText(html: string): string {
  const chunks: string[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]) as unknown;
      chunks.push(JSON.stringify(data));
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return chunks.join("\n");
}

/** Convert HTML to plain text while preserving some block structure. */
export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "\n")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const jsonLd = extractJsonLdText(html);
  if (jsonLd) {
    text = `${text}\n\nStructured data:\n${jsonLd}`;
  }

  return text;
}
