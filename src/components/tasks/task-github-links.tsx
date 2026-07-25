"use client";

import { useActionState, useRef, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { addTaskGithubLinkAction, deleteTaskGithubLinkAction, type TaskFormState } from "@/actions/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/shared/github-icon";

type GithubLink = { id: string; type: "ISSUE" | "PR"; number: number; url: string };

const initialState: TaskFormState = {};

export function TaskGithubLinks({
  taskId,
  links,
  canEdit,
}: {
  taskId: string;
  links: GithubLink[];
  canEdit: boolean;
}) {
  const action = addTaskGithubLinkAction.bind(null, taskId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [isDeleting, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleDelete(linkId: string) {
    startTransition(async () => {
      try {
        await deleteTaskGithubLinkAction(linkId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover link.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link.id} className="flex items-center gap-2 text-sm">
          <GithubIcon className="size-3.5 text-muted-foreground" />
          <a href={link.url} target="_blank" rel="noreferrer" className="hover:underline">
            {link.type === "PR" ? "PR" : "Issue"} #{link.number}
          </a>
          {canEdit && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDelete(link.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="flex gap-2 pt-1"
        >
          <Input
            name="url"
            placeholder="Cola o URL da issue/PR do GitHub"
            className="h-8"
          />
          <Button type="submit" size="sm" variant="outline" disabled={isPending}>
            Ligar
          </Button>
        </form>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.fieldErrors?.url && (
        <p className="text-sm text-destructive">{state.fieldErrors.url[0]}</p>
      )}
    </div>
  );
}
