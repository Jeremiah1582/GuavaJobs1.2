/** Epoch milliseconds stored as Prisma `BigInt` (Postgres BIGINT). */

export function epochMsNow(): bigint {
  return BigInt(Date.now());
}

export function toEpochMsNumber(
  value: bigint | number | null | undefined,
): number | null {
  if (value == null) return null;
  return Number(value);
}

export function epochMsToDate(
  value: bigint | number | null | undefined,
): Date | null {
  const n = toEpochMsNumber(value);
  if (n == null) return null;
  return new Date(n);
}

/** Safe for `NextResponse.json` (bigint is not JSON-serializable). */
export function epochMsToIso(
  value: bigint | number | null | undefined,
): string | null {
  const d = epochMsToDate(value);
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}
