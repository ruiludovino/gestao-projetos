import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { isOwnerEmail } from "@/lib/invites";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EditBugDetailsForm } from "@/components/bugs/edit-bug-details-form";
import { BugStatusSelect } from "@/components/bugs/bug-status-select";
import { BugPrioritySelect } from "@/components/bugs/bug-priority-select";
import { BugAssigneeSelect } from "@/components/bugs/bug-assignee-select";
import { BugLabelsEditor } from "@/components/bugs/bug-labels-editor";
import { AttachmentsSection } from "@/components/bugs/attachments-section";
import { CommentForm } from "@/components/bugs/comment-form";
import { GithubIssueButton } from "@/components/bugs/github-issue-button";
import { DeleteBugButton } from "@/components/bugs/delete-bug-button";

export default async function BugDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; bugId: string }>;
}) {
  const { projectId, bugId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, bug, members, allLabels] = await Promise.all([
    getMembership(projectId, userId),
    prisma.bug.findUniqueOrThrow({
      where: { id: bugId },
      include: {
        reporter: { select: { name: true, email: true, image: true } },
        labels: { include: { label: true } },
        attachments: { include: { uploadedBy: { select: { name: true, email: true } } } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true, email: true, image: true } } },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.label.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
  ]);

  const canEdit = canEditContent(membership.role);
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);
  const canDelete = isOwner || bug.reporterId === userId;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">BUG-{bug.number}</span>
        <div className="flex items-center gap-2">
          <GithubIssueButton bugId={bug.id} githubIssueUrl={bug.githubIssueUrl} />
          {canDelete && (
            <DeleteBugButton bugId={bug.id} redirectTo={`/projetos/${projectId}/bugs`} />
          )}
        </div>
      </div>

      <EditBugDetailsForm
        bugId={bug.id}
        title={bug.title}
        description={bug.description}
        canEdit={canEdit}
      />

      <div className="flex flex-wrap items-center gap-6 rounded-lg border p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Estado</p>
          <BugStatusSelect bugId={bug.id} value={bug.status} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Prioridade</p>
          <BugPrioritySelect bugId={bug.id} value={bug.priority} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Atribuído a</p>
          <BugAssigneeSelect
            bugId={bug.id}
            value={bug.assigneeId}
            members={members}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Reportado por</p>
          <p className="text-sm">{bug.reporter.name ?? bug.reporter.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Labels</p>
        <BugLabelsEditor
          bugId={bug.id}
          projectId={projectId}
          allLabels={allLabels}
          selectedLabelIds={bug.labels.map((l) => l.labelId)}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Anexos</p>
        <AttachmentsSection bugId={bug.id} attachments={bug.attachments} canUpload={canEdit} />
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-medium">Comentários ({bug.comments.length})</h2>
        <ul className="space-y-4">
          {bug.comments.map((comment) => {
            const label = comment.author.name ?? comment.author.email ?? "?";
            return (
              <li key={comment.id} className="flex gap-3">
                <Avatar className="size-7">
                  <AvatarImage src={comment.author.image ?? undefined} alt={label} />
                  <AvatarFallback>{label.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <CommentForm bugId={bug.id} />
      </div>
    </div>
  );
}
