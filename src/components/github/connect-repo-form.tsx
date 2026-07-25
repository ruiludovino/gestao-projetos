"use client";

import { useActionState } from "react";

import { connectRepoAction, type GithubFormState } from "@/actions/github";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: GithubFormState = {};

export function ConnectRepoForm({ projectId }: { projectId: string }) {
  const action = connectRepoAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-start gap-2">
      <div className="space-y-1">
        <Label htmlFor="repo" className="sr-only">
          Repositório
        </Label>
        <Input id="repo" name="repo" placeholder="owner/repo ou URL do GitHub" className="w-72" />
        {(state.error || state.fieldErrors?.repo) && (
          <p className="text-sm text-destructive">
            {state.error ?? state.fieldErrors?.repo?.[0]}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "A ligar..." : "Ligar repositório"}
      </Button>
    </form>
  );
}
