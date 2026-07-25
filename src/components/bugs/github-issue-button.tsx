"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { createGithubIssueAction } from "@/actions/bugs";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/shared/github-icon";

export function GithubIssueButton({
  bugId,
  githubIssueUrl,
}: {
  bugId: string;
  githubIssueUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (githubIssueUrl) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={
          <a href={githubIssueUrl} target="_blank" rel="noreferrer">
            <GithubIcon className="size-4" />
            Ver issue no GitHub
          </a>
        }
      />
    );
  }

  function handleClick() {
    startTransition(async () => {
      try {
        await createGithubIssueAction(bugId);
        toast.success("Issue criada no GitHub.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao criar issue.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      <GithubIcon className="size-4" />
      {isPending ? "A criar issue..." : "Criar issue no GitHub"}
    </Button>
  );
}
