import { prisma } from "@/db";
import { epochMsNow } from "@/lib/epoch-ms";

export const STALE_SCRAPE_MS = 15 * 60 * 1000;

export async function clearStaleScrapeRuns(): Promise<number> {
  const cutoff = Date.now() - STALE_SCRAPE_MS;
  const stale = await prisma.scrapeRun.findMany({
    where: { status: "running", startedAt: { lt: BigInt(cutoff) } },
  });

  for (const run of stale) {
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        finishedAt: epochMsNow(),
        error: "Scrape timed out or was interrupted.",
      },
    });
  }

  return stale.length;
}
