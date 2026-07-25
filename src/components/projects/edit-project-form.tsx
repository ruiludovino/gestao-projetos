"use client";

import { useActionState } from "react";

import { updateProjectAction, type ProjectFormState } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ProjectFormState = {};

type EditProjectFormProps = {
  projectId: string;
  defaultName: string;
  defaultDescription: string | null;
};

export function EditProjectForm({
  projectId,
  defaultName,
  defaultDescription,
}: EditProjectFormProps) {
  const action = updateProjectAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do projeto</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultDescription ?? ""}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "A guardar..." : "Guardar alterações"}
      </Button>
    </form>
  );
}
