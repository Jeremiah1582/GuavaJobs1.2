import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col gap-10">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-2/3 max-w-md" />
          <Skeleton className="h-5 w-full max-w-lg" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  )
}
