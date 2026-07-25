"use client";

import { useActionState } from "react";

import { createCredentialAction, type CredentialFormState } from "@/actions/credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: CredentialFormState = {};

export function CredentialForm({ projectId }: { projectId: string }) {
  const action = createCredentialAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="serviceName">Nome do serviço</Label>
        <Input id="serviceName" name="serviceName" placeholder="ex: Neon, GitHub, Stripe" required />
        {fieldErrors.serviceName && (
          <p className="text-sm text-destructive">{fieldErrors.serviceName[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL (opcional)</Label>
        <Input id="url" name="url" placeholder="https://..." />
        {fieldErrors.url && <p className="text-sm text-destructive">{fieldErrors.url[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username (opcional)</Label>
        <Input id="username" name="username" autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        {fieldErrors.password && (
          <p className="text-sm text-destructive">{fieldErrors.password[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "A guardar..." : "Guardar credencial"}
      </Button>
    </form>
  );
}
