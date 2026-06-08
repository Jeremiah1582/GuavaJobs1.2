import { DashboardOverview } from "@/components/dashboard/overview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — GuavaJobs",
  description: "Your personalized job hunt command center.",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
