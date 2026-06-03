import Link from "next/link"

import { EmptyState } from "@/components/empty-state"
import { LayoutDashboard } from "lucide-react"

export default function ApplicationNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <EmptyState
        icon={LayoutDashboard}
        title="Application not found"
        description="This application may have been removed or you do not have access to it."
        action={{ label: "Back to tracker", href: "/dashboard" }}
      />
      <p className="mt-6 text-center text-sm">
        <Link href="/dashboard" className="text-accent hover:underline">
          Return to dashboard
        </Link>
      </p>
    </div>
  )
}
