"use client";

import { useTransition } from "react";
import { Pin } from "lucide-react";
import { toast } from "sonner";

import { togglePinNoteAction } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PinNoteButton({ noteId, isPinned }: { noteId: string; isPinned: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await togglePinNoteAction(noteId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar nota.");
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={isPending} onClick={handleClick}>
      <Pin className={cn("size-4", isPinned && "fill-amber-500 text-amber-500")} />
      {isPinned ? "Fixada" : "Fixar"}
    </Button>
  );
}
