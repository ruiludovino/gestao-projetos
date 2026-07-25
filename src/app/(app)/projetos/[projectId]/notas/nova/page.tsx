import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoteForm } from "@/components/notes/note-form";

export default async function NewNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { projectId } = await params;
  const { folder } = await searchParams;

  const [folders, members] = await Promise.all([
    prisma.noteFolder.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Nova nota</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <NoteForm
            projectId={projectId}
            folders={folders}
            members={members}
            defaultFolderId={folder}
          />
        </CardContent>
      </Card>
    </div>
  );
}
