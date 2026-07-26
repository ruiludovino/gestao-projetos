"use client";

import { useActionState } from "react";

import { createRuleAction, type RuleFormState } from "@/actions/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/shared/markdown-editor";

const initialState: RuleFormState = {};

export function RuleForm({ projectId }: { projectId: string }) {
  const action = createRuleAction.bind(null, projectId);
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
        <Label htmlFor="content">Conteúdo</Label>
        <MarkdownEditor id="content" name="content" rows={14} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "A criar..." : "Criar regra"}
      </Button>
    </form>
  );
}
