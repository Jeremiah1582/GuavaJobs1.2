import type { LucideIcon } from "lucide-react"
import {
  Briefcase,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Search,
  UserRound,
} from "lucide-react"

export type DashboardNavItem = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
  mobilePrimary?: boolean
}

export type DashboardNavGroup = {
  label: string
  items: DashboardNavItem[]
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Your hunt at a glance",
    mobilePrimary: true,
  },
  {
    title: "Jobs",
    href: "/dashboard/jobs",
    icon: Search,
    description: "Find and track listings",
    mobilePrimary: true,
  },
  {
    title: "Applications",
    href: "/dashboard/applications",
    icon: Briefcase,
    description: "Pipeline and cover letters",
    mobilePrimary: true,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: UserRound,
    description: "CV and career details",
    mobilePrimary: true,
  },
  {
    title: "Resume scan",
    href: "/dashboard/resume",
    icon: FileText,
    description: "ATS score your CV",
  },
  {
    title: "Career coach",
    href: "/dashboard/chat",
    icon: MessageSquare,
    description: "AI interview prep",
  },
]

export const primaryMobileNav = dashboardNavItems.filter((item) => item.mobilePrimary)

/** All sidebar routes (excludes legacy `/dashboard/cover`). */
export const sidebarNav = dashboardNavItems

/** Grouped sidebar navigation — hunt flow first, account & tools after. */
export const sidebarNavGroups: DashboardNavGroup[] = [
  {
    label: "Hunt",
    items: dashboardNavItems.filter((item) =>
      ["/dashboard", "/dashboard/jobs", "/dashboard/applications"].includes(item.href),
    ),
  },
  {
    label: "You",
    items: dashboardNavItems.filter((item) => item.href === "/dashboard/profile"),
  },
  {
    label: "Tools",
    items: dashboardNavItems.filter((item) =>
      ["/dashboard/resume", "/dashboard/chat"].includes(item.href),
    ),
  },
]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getNavTitleForPath(pathname: string): string {
  const exact = dashboardNavItems.find((item) => item.href === pathname)
  if (exact) return exact.title

  if (pathname.startsWith("/dashboard/applications/")) return "Application"
  if (pathname.startsWith("/dashboard/applications")) return "Applications"

  return "Dashboard"
}
