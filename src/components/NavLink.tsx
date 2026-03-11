import Link from "next/link";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

interface NavLinkProps extends ComponentProps<typeof Link> {
  className?: string;
}

export function NavLink({ className, ...props }: NavLinkProps) {
  return <Link className={cn(className)} {...props} />;
}
