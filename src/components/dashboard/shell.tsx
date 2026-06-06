"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps, ReactNode } from "react"
import { ChevronsUpDown, LogOut, Plus, Search, UserRound, type LucideIcon } from "lucide-react"

import { AppToaster } from "@/components/ui/sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { signOutAction } from "@/lib/auth/actions"
import {
  getNavTitleForPath,
  isNavActive,
  primaryMobileNav,
  sidebarNavGroups,
} from "@/lib/dashboard/nav-config"
import { cn } from "@/lib/utils"

// ——— Sidebar internals ———

function NavBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/dashboard">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-guava-pink-gradient text-sm font-bold text-accent-foreground">
              G
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-white">GuavaJobs</span>
              <span className="truncate text-xs text-white/75">Hunt smarter</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavLinkGroup({
  label,
  items,
  showNewApplication,
  hideWhenCollapsed,
}: {
  label: string
  items: { title: string; href: string; icon: LucideIcon }[]
  showNewApplication?: boolean
  hideWhenCollapsed?: boolean
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className={cn(hideWhenCollapsed && "group-data-[collapsible=icon]:hidden")}>
      <SidebarGroupLabel className="text-white/70">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {showNewApplication ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="New application"
                className="bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                <Link href="/dashboard/applications/new">
                  <Plus />
                  <span>New application</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isNavActive(pathname, item.href)}
                tooltip={item.title}
                className="text-white/90 hover:bg-white/15 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white"
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function getInitials(displayName: string | undefined, email: string): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
    return displayName.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function NavUser({ displayName, email }: { displayName?: string; email: string }) {
  const { isMobile } = useSidebar()
  const name = displayName?.trim() || email.split("@")[0] || "User"
  const initials = getInitials(displayName, email)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="text-white hover:bg-white/15 hover:text-white data-[state=open]:bg-white/20 data-[state=open]:text-white"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-guava-green-gradient text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{name}</span>
                <span className="truncate text-xs text-white/75">{email}</span>
              </div>
              <ChevronsUpDown className="ml-auto text-white/80" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-guava-green-gradient text-xs font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <UserRound />
                  Profile
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOutAction()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function AppSidebar({
  displayName,
  email,
  ...props
}: ComponentProps<typeof Sidebar> & { displayName?: string; email: string }) {
  const huntGroup = sidebarNavGroups.find((g) => g.label === "Hunt")
  const youGroup = sidebarNavGroups.find((g) => g.label === "You")
  const toolsGroup = sidebarNavGroups.find((g) => g.label === "Tools")

  return (
    <Sidebar
      collapsible="icon"
      className="bg-guava-pink-gradient text-white [&_[data-sidebar=sidebar]]:bg-transparent"
      {...props}
    >
      <SidebarHeader>
        <NavBrand />
      </SidebarHeader>
      <SidebarContent>
        {huntGroup ? (
          <NavLinkGroup label={huntGroup.label} items={huntGroup.items} showNewApplication />
        ) : null}
        {youGroup ? <NavLinkGroup label={youGroup.label} items={youGroup.items} /> : null}
        {toolsGroup ? (
          <NavLinkGroup label={toolsGroup.label} items={toolsGroup.items} hideWhenCollapsed />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser displayName={displayName} email={email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function DashboardBreadcrumb() {
  const pathname = usePathname()
  const pageTitle = getNavTitleForPath(pathname)
  const isOverview = pathname === "/dashboard"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink asChild>
            <Link href="/dashboard">GuavaJobs</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{isOverview ? "Overview" : pageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function DashboardHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <DashboardBreadcrumb />
      </div>
      <div className="flex items-center gap-2 px-4">
        <Button asChild size="sm" variant="ghost" className="hidden h-8 gap-1.5 sm:inline-flex">
          <Link href="/dashboard/jobs">
            <Search />
            Jobs
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="h-8 gap-1.5 bg-guava-pink-gradient text-accent-foreground hover:opacity-90"
        >
          <Link href="/dashboard/applications/new">
            <Plus />
            <span className="sr-only sm:not-sr-only">New</span>
          </Link>
        </Button>
      </div>
    </header>
  )
}

function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/85 backdrop-blur-xl md:hidden"
      aria-label="Primary navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2">
        {primaryMobileNav.map((item) => {
          const active = isNavActive(pathname, item.href)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all duration-200",
                  active ? "text-guava-pink" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-guava-pink-gradient"
                    aria-hidden
                  />
                ) : null}
                <item.icon
                  className={cn(
                    active &&
                      "drop-shadow-[0_0_10px_color-mix(in_oklch,var(--guava-pink)_35%,transparent)]",
                  )}
                  aria-hidden
                />
                <span>{item.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ——— Public export ———

type DashboardShellProps = {
  children: ReactNode
  displayName?: string
  email: string
}

export function DashboardShell({ children, displayName, email }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar displayName={displayName} email={email} />
      <SidebarInset className="dashboard-canvas min-w-0">
        <DashboardHeader />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-2 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:gap-6 md:p-2 md:pb-2">
          {children}
        </div>
        <MobileNav />
        <AppToaster />
      </SidebarInset>
    </SidebarProvider>
  )
}
