import type { ReactNode } from "react";

import { auth } from "@/auth";
import { getMembership, getProject } from "@/lib/project-data";
import { canManageProject, canViewCredentials } from "@/lib/permissions";
import { ProjectNav } from "@/components/projects/project-nav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [project, membership] = await Promise.all([
    getProject(projectId),
    getMembership(projectId, userId),
  ]);

  return (
    <div className="-m-6 flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
      </div>
      <ProjectNav
        projectId={projectId}
        showCredentials={canViewCredentials(membership.role)}
        showSettings={canManageProject(membership.role)}
      />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
