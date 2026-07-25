"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { toggleNoteResolvedAction } from "@/actions/notes";
import { Button } from "@/components/ui/button";

export function ResolveNoteButton({
  noteId,
  isResolved,
}: {
  noteId: string;
  isResolved: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      try {
        await toggleNoteResolvedAction(noteId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar a nota.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
    >
      {isResolved ? (
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
