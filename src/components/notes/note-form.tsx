"use client";

import { useActionState } from "react";

import { createNoteAction, type NoteFormState } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "@/components/shared/markdown-editor";

const initialState: NoteFormState = {};

const NO_FOLDER = "__none__";

type Folder = { id: string; name: string };
type Member = { userId: string; user: { name: string | null; email: string | null } };

export function NoteForm({
  projectId,
  folders,
  members,
  currentUserId,
  defaultFolderId,
}: {
  projectId: string;
  folders: Folder[];
  members: Member[];
  currentUserId: string;
  defaultFolderId?: string;
}) {
  const action = createNoteAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required autoFocus />
        {fieldErrors.title && (
          <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="folderId">Pasta (opcional)</Label>
        <Select
          name="folderId"
          items={{ [NO_FOLDER]: "Sem pasta", ...Object.fromEntries(folders.map((f) => [f.id, f.name])) }}
          defaultValue={defaultFolderId ?? NO_FOLDER}
        >
          <SelectTrigger className="w-full" id="folderId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_FOLDER}>Sem pasta</SelectItem>
            {folders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assigneeId">Responsável por resolver</Label>
        <Select
          name="assigneeId"
          items={Object.fromEntries(
            members.map((member) => [member.userId, member.user.name ?? member.user.email]),
          )}
          defaultValue={currentUserId}
        >
          <SelectTrigger className="w-full" id="assigneeId">
            <SelectValue placeholder="Ninguém" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.user.name ?? member.user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo</Label>
        <MarkdownEditor id="content" name="content" rows={14} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "A criar..." : "Criar nota"}
      </Button>
    </form>
  );
}
