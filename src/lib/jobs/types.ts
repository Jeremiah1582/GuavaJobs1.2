/** Adzuna-supported markets for search UI. */
export type JobCountry = "gb" | "de";

export type JobSource = "adzuna" | "remotive" | "serpapi";

export type JobSalary = {
  min?: number;
  max?: number;
  currency?: string;
  isPredicted?: boolean;
};

/** Normalised listing returned by jobsService (search + detail). */
export type JobListing = {
  id: string;
  country: JobCountry;
  /** Required on all listings (v2). */
  source: JobSource;
  /** Present for Adzuna / legacy `gb-*` / `de-*` ids. */
  adzunaId?: string;
  sourceJobId?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  createdAt?: string;
  redirectUrl: string;
  category?: string;
  contractType?: string;
  salary?: JobSalary;
  remote?: boolean;
  companyLogoUrl?: string;
};

export type JobSortBy = "relevance" | "date";

/** Raw search params (coerced by jobSearchSchema in jobsService.search). */
export type JobSearchInput = {
  q?: string;
  where?: string;
  country?: JobCountry;
  page?: number | string;
  resultsPerPage?: number | string;
  distanceKm?: number | string;
  maxDaysOld?: number | string;
  sortBy?: JobSortBy | string;
  refresh?: boolean | string;
};

export type JobSourceStatus = {
  id: JobSource;
  ok: boolean;
  count?: number;
  error?: string;
};

export type JobSearchResult = {
  jobs: JobListing[];
  totalCount: number;
  page: number;
  resultsPerPage: number;
  country: JobCountry;
  sources?: JobSourceStatus[];
  warnings?: string[];
};
