"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteTaskAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteTaskButton({
  taskId,
  redirectTo,
  size = "sm",
}: {
  taskId: string;
  redirectTo?: string;
  size?: "sm" | "icon-sm";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      try {
        await deleteTaskAction(taskId);
        toast.success("Tarefa removida.");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover tarefa.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={size}
            aria-label="Remover tarefa"
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
          >
            <Trash2 className="size-3.5" />
            {size === "sm" && "Remover"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover esta tarefa?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. As subtarefas também são removidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
