import { createHash } from "node:crypto";

export function descriptionFingerprint(jdText: string): string {
  const normalized = jdText.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
