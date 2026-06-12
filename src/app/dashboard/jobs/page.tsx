import { JobsPageClient } from "@/components/jobs/jobs-page-client";
import { requireSession } from "@/lib/auth/require-session";
import { loadJobsDashboard } from "@/lib/jobs/load-jobs-dashboard";
import {
  jobsPageQueryKey,
  listOptionsFromJobsPageParams,
  normalizeJobsPageSearchParams,
  resolveJobSearchDefaultsFromProfile,
} from "@/lib/jobs/jobs-page-params";
import { toDashboardJob } from "@/lib/jobs/dashboard-job";
import { profileService } from "@/lib/profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Jobs",
  description:
    "Search the global job index, see recommended matches, and apply in one click.",
};

type DashboardJobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardJobsPage({
  searchParams,
}: DashboardJobsPageProps) {
  const session = await requireSession();
  const raw = await searchParams;
  const options = listOptionsFromJobsPageParams(
    normalizeJobsPageSearchParams(raw),
  );
  const [loaded, profile] = await Promise.all([
    loadJobsDashboard(session.id, options),
    profileService.getByUserId(session.id),
  ]);

  const profileSearchDefaults = resolveJobSearchDefaultsFromProfile({
    location: profile?.location,
    city: profile?.city,
    country: profile?.country,
    targetSeniority: profile?.targetSeniority,
  });

  return (
    <JobsPageClient
      initialJobs={loaded.jobs.map((j) => toDashboardJob(j))}
      initialHasResume={loaded.hasResume}
      initialSearchProfile={loaded.searchProfile}
      initialWidenedFamilies={loaded.widenedFamilies}
      initialGlobalJobCount={loaded.globalJobCount}
      initialQueryKey={jobsPageQueryKey(options)}
      profileSearchDefaults={profileSearchDefaults}
    />
  );
}
