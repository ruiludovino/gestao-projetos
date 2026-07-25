"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/shared/markdown";

type Version = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  editedBy: { name: string | null; email: string | null };
};

export function VersionHistory({ versions }: { versions: Version[] }) {
  const [selected, setSelected] = useState<Version | null>(null);

  if (versions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Histórico de versões</p>
      <ul className="space-y-1">
        {versions.map((version) => (
          <li key={version.id}>
            <button
              type="button"
              onClick={() => setSelected(version)}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {version.editedBy.name ?? version.editedBy.email} editou{" "}
              {formatDistanceToNow(version.createdAt, { addSuffix: true, locale: pt })}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && <Markdown content={selected.content} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
