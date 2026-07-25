"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import { updateBugDetailsAction, type BugFormState } from "@/actions/bugs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Markdown } from "@/components/shared/markdown";

const initialState: BugFormState = {};

export function EditBugDetailsForm({
  bugId,
  title,
  description,
  canEdit,
}: {
  bugId: string;
  title: string;
  description: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateBugDetailsAction.bind(null, bugId);
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
          {description ? (
            <Markdown content={description} />
          ) : (
            <p className="text-sm text-muted-foreground">Sem descrição.</p>
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
        <Label htmlFor="description">Descrição</Label>
        <MarkdownEditor id="description" name="description" defaultValue={description} rows={8} />
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
