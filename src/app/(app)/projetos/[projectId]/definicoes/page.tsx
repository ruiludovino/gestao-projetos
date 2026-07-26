import { auth } from "@/auth";
import { getMembership, getProject } from "@/lib/project-data";
import { prisma } from "@/lib/prisma";
import { canManageProject } from "@/lib/permissions";
import { isOwnerEmail } from "@/lib/invites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditProjectForm } from "@/components/projects/edit-project-form";
import { AddMemberDialog } from "@/components/projects/add-member-dialog";
import { MembersTable } from "@/components/projects/members-table";
import { PendingInvites } from "@/components/projects/pending-invites";
import { ArchiveProjectButton } from "@/components/projects/archive-project-button";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [project, membership] = await Promise.all([
    getProject(projectId),
    getMembership(projectId, userId),
  ]);

  if (!canManageProject(membership.role)) {
    return (
      <p className="text-sm text-muted-foreground">
        Só administradores do projeto podem aceder às definições.
      </p>
    );
  }

  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);
  const canDeleteProject = isOwner || project.createdById === userId;

  const [members, invites] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectInvite.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <EditProjectForm
            projectId={projectId}
            defaultName={project.name}
            defaultDescription={project.description}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Membros</CardTitle>
          <AddMemberDialog projectId={projectId} />
        </CardHeader>
        <CardContent>
          <MembersTable
            projectId={projectId}
            members={members}
            creatorId={project.createdById}
            currentUserId={userId}
          />
          <div className="mt-4">
            <PendingInvites invites={invites} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Zona de perigo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ArchiveProjectButton projectId={projectId} archived={project.archived} />
          {canDeleteProject && <DeleteProjectButton projectId={projectId} />}
        </CardContent>
      </Card>
    </div>
  );
}
