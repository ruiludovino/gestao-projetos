import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/command-palette/command-palette";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.user.id, project: { archived: false } },
    select: { project: { select: { id: true, name: true } } },
    orderBy: { project: { name: "asc" } },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CommandPalette projects={memberships.map((m) => m.project)} />
    </div>
  );
}
