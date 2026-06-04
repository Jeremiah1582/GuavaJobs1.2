// src/lib/pdf-extract.server.ts — server-side PDF text extraction (no web worker)

export const MAX_RESUME_PAGES = 5;

export type PdfExtractResult = {
  text: string;
  pagesExtracted: number;
  totalPages: number;
};

type ExtractOptions = {
  maxPages?: number;
};

type PdfTextItem = {
  str: string;
  transform: number[];
};

export async function extractTextFromPdfBuffer(
  buffer: Buffer,
  options: ExtractOptions = {},
): Promise<PdfExtractResult> {
  const maxPages = options.maxPages ?? MAX_RESUME_PAGES;
  const errors: string[] = [];

  try {
    const result = await extractWithPdfJs(buffer, maxPages);
    if (result.text.length >= 10) return result;
    errors.push("pdfjs: extracted text too short");
  } catch (err) {
    errors.push(
      `pdfjs: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  throw new Error(
    errors.length
      ? `Could not read PDF (${errors.join("; ")})`
      : "Could not read PDF",
  );
}

/** Sort text items in reading order (top→bottom, left→right). */
function pageItemsToText(items: PdfTextItem[]): string {
  const sorted = [...items].sort((a, b) => {
    const yA = a.transform[5] ?? 0;
    const yB = b.transform[5] ?? 0;
    if (Math.abs(yA - yB) > 6) return yB - yA;
    return (a.transform[4] ?? 0) - (b.transform[4] ?? 0);
  });

  const lines: string[] = [];
  let currentLine = "";
  let lastY: number | null = null;

  for (const item of sorted) {
    const y = item.transform[5] ?? 0;
    if (lastY !== null && Math.abs(y - lastY) > 6) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = "";
    }
    const gap =
      currentLine && !currentLine.endsWith(" ") && !item.str.startsWith(" ")
        ? " "
        : "";
    currentLine += gap + item.str;
    lastY = y;
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  return lines.join("\n");
}

async function extractWithPdfJs(
  buffer: Buffer,
  maxPages: number,
): Promise<PdfExtractResult> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  const totalPages = doc.numPages;
  const pagesToRead = Math.min(totalPages, maxPages);
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items.flatMap((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "str" in item &&
        typeof item.str === "string" &&
        Array.isArray(item.transform)
      ) {
        return [{ str: item.str, transform: item.transform as number[] }];
      }
      return [];
    });

    const pageText = pageItemsToText(items);
    if (pageText.trim()) {
      parts.push(
        totalPages > 1
          ? `--- Page ${pageNum} ---\n${pageText}`
          : pageText,
      );
    }
  }

  if (totalPages > maxPages) {
    parts.push(
      `\n[Note: PDF has ${totalPages} pages; pages ${maxPages + 1}–${totalPages} were not included.]`,
    );
  }

  return {
    text: normalizeExtractedText(parts.join("\n\n")),
    pagesExtracted: pagesToRead,
    totalPages,
  };
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isPdfUpload(file: File): boolean {
  if (file.type === "application/pdf") return true;
  return file.name.toLowerCase().endsWith(".pdf");
}

/** Text budget for LLM prompts (~5 pages of dense resume). */
export function resumeTextForAI(fullText: string, maxChars = 18_000): string {
  if (fullText.length <= maxChars) return fullText;
  const head = fullText.slice(0, Math.floor(maxChars * 0.65));
  const tail = fullText.slice(-Math.floor(maxChars * 0.35));
  return `${head}\n\n[...middle sections truncated for length...]\n\n${tail}`;
}
