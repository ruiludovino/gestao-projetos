"use client";

import { useActionState } from "react";

import { createAppRouteAction, type AppRouteFormState } from "@/actions/app-routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: AppRouteFormState = {};

export function AppRouteForm({ projectId }: { projectId: string }) {
  const action = createAppRouteAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" placeholder="ex: Página de login" required autoFocus />
        {fieldErrors.description && (
          <p className="text-sm text-destructive">{fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="link">Link</Label>
        <Input id="link" name="link" placeholder="/login ou https://..." required />
        {fieldErrors.link && <p className="text-sm text-destructive">{fieldErrors.link[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" name="notes" rows={4} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "A guardar..." : "Guardar rota"}
      </Button>
    </form>
  );
}
