"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Folder } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreateFolderPopover } from "@/components/tasks/create-folder-popover";
import { TaskFolderActions } from "@/components/tasks/task-folder-actions";
import { cn } from "@/lib/utils";

type FolderItem = { id: string; name: string; parentId: string | null };

function buildFolderDepths(folders: FolderItem[]) {
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

export function FolderMenu({
  projectId,
  basePath,
  folders,
  currentFolderId,
  canEdit,
  extraParams,
}: {
  projectId: string;
  basePath: string;
  folders: FolderItem[];
  currentFolderId?: string;
  canEdit: boolean;
  extraParams?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const depths = buildFolderDepths(folders);
  const currentName = folders.find((f) => f.id === currentFolderId)?.name ?? "Todas as tarefas";

  function hrefFor(folderId?: string) {
    const params = new URLSearchParams(extraParams);
    if (folderId) params.set("folder", folderId);
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ""}`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Folder className="size-3.5" />
            {currentName}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64 p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Pastas</span>
          {canEdit && <CreateFolderPopover projectId={projectId} />}
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          <Link
            href={hrefFor()}
            onClick={() => setOpen(false)}
            className={cn(
              "block rounded-md px-2 py-1.5 text-sm hover:bg-accent",
              !currentFolderId && "bg-accent font-medium",
            )}
          >
            Todas as tarefas
          </Link>
          {folders.map((f) => (
            <div
              key={f.id}
              className={cn(
                "group flex items-center justify-between rounded-md pr-1 text-sm hover:bg-accent",
                currentFolderId === f.id && "bg-accent font-medium",
              )}
            >
              <Link
                href={hrefFor(f.id)}
                onClick={() => setOpen(false)}
                style={{ paddingLeft: `${8 + (depths.get(f.id) ?? 0) * 12}px` }}
                className="flex flex-1 items-center gap-1.5 py-1.5"
              >
                <Folder className="size-3.5 text-muted-foreground" />
                {f.name}
              </Link>
              {canEdit && (
                <span className="opacity-0 group-hover:opacity-100">
                  <TaskFolderActions folderId={f.id} name={f.name} />
                </span>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
