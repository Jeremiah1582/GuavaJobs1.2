/** F10 stub — always allow generation until quota ships. */

export async function assertCanGenerateAiLetter(_userId: string): Promise<void> {
  return;
}

export async function recordAiLetterGenerated(_userId: string): Promise<void> {
  return;
}

export async function getRemainingAiLetters(
  _userId: string,
): Promise<number | null> {
  return null;
}

export const usageService = {
  assertCanGenerateAiLetter,
  recordAiLetterGenerated,
  getRemainingAiLetters,
};
