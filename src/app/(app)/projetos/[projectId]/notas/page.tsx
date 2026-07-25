import Link from "next/link";
import { Plus, Pin, Folder } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { NotesSearch } from "@/components/notes/notes-search";
import { CreateFolderPopover } from "@/components/notes/create-folder-popover";
import { cn } from "@/lib/utils";

function buildFolderDepths(folders: { id: string; parentId: string | null }[]) {
  const depthById = new Map<string, number>();
  function depthOf(id: string): number {
    if (depthById.has(id)) return depthById.get(id)!;
    const folder = folders.find((f) => f.id === id);
    const depth = folder?.parentId ? depthOf(folder.parentId) + 1 : 0;
    depthById.set(id, depth);
    return depth;
  }
  for (const folder of folders) depthOf(folder.id);
  return depthById;
}

export default async function NotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string; folder?: string }>;
}) {
  const { projectId } = await params;
  const { q, folder } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, folders, notes] = await Promise.all([
    getMembership(projectId, userId),
    prisma.noteFolder.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
    prisma.note.findMany({
      where: {
        projectId,
        ...(folder ? { folderId: folder } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      include: { createdBy: { select: { name: true, email: true } } },
    }),
  ]);

  const canEdit = canEditContent(membership.role);
  const depths = buildFolderDepths(folders);

  return (
    <div className="flex gap-8">
      <aside className="w-56 shrink-0 space-y-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Pastas</span>
          {canEdit && <CreateFolderPopover projectId={projectId} />}
        </div>
        <Link
          href={`/projetos/${projectId}/notas`}
          className={cn(
            "block rounded-md px-2 py-1.5 text-sm hover:bg-accent",
            !folder && "bg-accent font-medium",
          )}
        >
          Todas as notas
        </Link>
        {folders.map((f) => (
          <Link
            key={f.id}
            href={`/projetos/${projectId}/notas?folder=${f.id}`}
            style={{ paddingLeft: `${8 + (depths.get(f.id) ?? 0) * 12}px` }}
            className={cn(
              "flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm hover:bg-accent",
              folder === f.id && "bg-accent font-medium",
            )}
          >
            <Folder className="size-3.5 text-muted-foreground" />
            {f.name}
          </Link>
        ))}
      </aside>

      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Notas</h1>
          <div className="flex items-center gap-2">
            <NotesSearch />
            {canEdit && (
              <Button
                render={
                  <Link href={`/projetos/${projectId}/notas/nova${folder ? `?folder=${folder}` : ""}`}>
                    <Plus className="size-4" />
                    Nova nota
                  </Link>
                }
              />
            )}
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há notas.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/projetos/${projectId}/notas/${note.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:border-foreground/30"
                >
                  <div className="flex items-center gap-2">
                    {note.isPinned && <Pin className="size-3.5 text-amber-500" />}
                    <span className="font-medium">{note.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Atualizada{" "}
                    {formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: pt })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
