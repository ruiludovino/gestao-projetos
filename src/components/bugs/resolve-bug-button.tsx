"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { BugStatus } from "@prisma/client";
import { toast } from "sonner";

import { updateBugStatusAction } from "@/actions/bugs";
import { Button } from "@/components/ui/button";

export function ResolveBugButton({
  bugId,
  isHistory,
}: {
  bugId: string;
  isHistory: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      try {
        await updateBugStatusAction(bugId, isHistory ? BugStatus.ABERTO : BugStatus.RESOLVIDO);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar o bug.");
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isHistory ? (
        <>
          <RotateCcw className="size-3.5" />
          Reabrir
        </>
      ) : (
        <>
          <CheckCircle2 className="size-3.5" />
          Resolvido
        </>
      )}
    </Button>
  );
}
