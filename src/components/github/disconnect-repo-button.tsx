"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { disconnectRepoAction } from "@/actions/github";
import { Button } from "@/components/ui/button";

export function DisconnectRepoButton({ repoId }: { repoId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await disconnectRepoAction(repoId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao desligar repositório.");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={handleClick} aria-label="Desligar repositório">
      <X className="size-3.5" />
    </Button>
  );
}
