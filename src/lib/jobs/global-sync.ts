import { prisma } from "@/db";

import {
  maybeSyncGlobalAtsJobs as maybeSyncGlobalAtsJobsImpl,
  staleGlobalAtsJobs as staleGlobalAtsJobsImpl,
  syncGlobalAtsJobs as syncGlobalAtsJobsImpl,
  upsertGlobalJobCache as upsertGlobalJobCacheImpl,
  type GlobalAtsSyncResult,
} from "./global-sync-impl";

export type { GlobalAtsSyncResult };

export function upsertGlobalJobCache(
  jobs: Parameters<typeof upsertGlobalJobCacheImpl>[1],
) {
  return upsertGlobalJobCacheImpl(prisma, jobs);
}

export function staleGlobalAtsJobs(activeIds: string[]) {
  return staleGlobalAtsJobsImpl(prisma, activeIds);
}

export function syncGlobalAtsJobs(): Promise<GlobalAtsSyncResult> {
  return syncGlobalAtsJobsImpl(prisma);
}

export function maybeSyncGlobalAtsJobs(): Promise<void> {
  return maybeSyncGlobalAtsJobsImpl(prisma);
}
