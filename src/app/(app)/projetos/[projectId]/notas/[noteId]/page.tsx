import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { isOwnerEmail } from "@/lib/invites";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EditNoteForm } from "@/components/notes/edit-note-form";
import { NoteAssigneeSelect } from "@/components/notes/note-assignee-select";
import { PinNoteButton } from "@/components/notes/pin-note-button";
import { DeleteNoteButton } from "@/components/notes/delete-note-button";
import { VersionHistory } from "@/components/notes/version-history";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; noteId: string }>;
}) {
  const { projectId, noteId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, note, members] = await Promise.all([
    getMembership(projectId, userId),
    prisma.note.findUniqueOrThrow({
      where: { id: noteId },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          include: { editedBy: { select: { name: true, email: true } } },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const canEdit = canEditContent(membership.role);
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);
  const canDelete = isOwner || note.createdById === userId;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <PinNoteButton noteId={note.id} isPinned={note.isPinned} />
        {canDelete && <DeleteNoteButton noteId={note.id} />}
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Responsável por resolver</Label>
        <NoteAssigneeSelect
          noteId={note.id}
          value={note.assigneeId}
          members={members}
          disabled={!canEdit}
        />
      </div>

      <EditNoteForm noteId={note.id} title={note.title} content={note.content} canEdit={canEdit} />

      <Separator />

      <VersionHistory versions={note.versions} />
    </div>
  );
}
