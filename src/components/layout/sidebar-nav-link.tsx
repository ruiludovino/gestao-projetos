"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SidebarNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent font-medium text-primary",
      )}
    >
      {children}
    </Link>
  );
}
