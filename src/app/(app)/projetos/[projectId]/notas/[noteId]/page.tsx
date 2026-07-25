import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { Separator } from "@/components/ui/separator";
import { EditNoteForm } from "@/components/notes/edit-note-form";
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

  const [membership, note] = await Promise.all([
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
  ]);

  const canEdit = canEditContent(membership.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <PinNoteButton noteId={note.id} isPinned={note.isPinned} />
        {canEdit && <DeleteNoteButton noteId={note.id} />}
      </div>

      <EditNoteForm noteId={note.id} title={note.title} content={note.content} canEdit={canEdit} />

      <Separator />

      <VersionHistory versions={note.versions} />
    </div>
  );
}
