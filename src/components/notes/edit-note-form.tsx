"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import { updateNoteAction, type NoteFormState } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Markdown } from "@/components/shared/markdown";

const initialState: NoteFormState = {};

export function EditNoteForm({
  noteId,
  title,
  content,
  canEdit,
}: {
  noteId: string;
  title: string;
  content: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateNoteAction.bind(null, noteId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (!editing) {
    return (
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {canEdit && (
            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
        <div className="mt-4">
          {content ? (
            <Markdown content={content} />
          ) : (
            <p className="text-sm text-muted-foreground">Nota vazia.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setEditing(false);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={title} required />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo</Label>
        <MarkdownEditor id="content" name="content" defaultValue={content} rows={14} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "A guardar..." : "Guardar"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
