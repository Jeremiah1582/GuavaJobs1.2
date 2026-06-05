import { ApiErrorCode } from "../api/errors";
import { getPrisma } from "@/db";
import {
  savedJobSearchCreateSchema,
  type SavedJobSearchCreateInput,
} from "../validators/saved-job-searches";
import { ApplicationsServiceError } from "../applications/errors";

const MAX_SAVED_SEARCHES_PER_USER = 20;

export type SavedJobSearchDto = {
  id: string;
  label: string;
  q: string | null;
  where: string | null;
  country: string;
  distanceKm: number | null;
  maxDaysOld: number | null;
  sortBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(row: {
  id: string;
  label: string;
  q: string | null;
  where: string | null;
  country: string;
  distanceKm: number | null;
  maxDaysOld: number | null;
  sortBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SavedJobSearchDto {
  return {
    id: row.id,
    label: row.label,
    q: row.q,
    where: row.where,
    country: row.country,
    distanceKm: row.distanceKm,
    maxDaysOld: row.maxDaysOld,
    sortBy: row.sortBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listByUser(userId: string): Promise<SavedJobSearchDto[]> {
  
  const rows = await getPrisma().savedJobSearch.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDto);
}

export async function create(
  userId: string,
  input: SavedJobSearchCreateInput,
): Promise<SavedJobSearchDto> {
  const parsed = savedJobSearchCreateSchema.parse(input);
  

  const count = await getPrisma().savedJobSearch.count({ where: { userId } });
  if (count >= MAX_SAVED_SEARCHES_PER_USER) {
    throw new ApplicationsServiceError(
      ApiErrorCode.VALIDATION_ERROR,
      `You can save up to ${MAX_SAVED_SEARCHES_PER_USER} searches. Delete one to add another.`,
      400,
    );
  }

  const row = await getPrisma().savedJobSearch.create({
    data: {
      userId,
      label: parsed.label,
      q: parsed.q ?? null,
      where: parsed.where ?? null,
      country: parsed.country,
      distanceKm: parsed.distanceKm ?? null,
      maxDaysOld: parsed.maxDaysOld ?? null,
      sortBy: parsed.sortBy ?? null,
    },
  });
  return toDto(row);
}

export async function remove(userId: string, id: string): Promise<void> {
  
  const existing = await getPrisma().savedJobSearch.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new ApplicationsServiceError(
      ApiErrorCode.NOT_FOUND,
      "Saved search not found",
      404,
    );
  }
  await getPrisma().savedJobSearch.delete({ where: { id } });
}

export const savedJobSearchesService = {
  listByUser,
  create,
  remove,
};
