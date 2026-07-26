"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteProjectAction } from "@/actions/projects";
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

export function DeleteProjectButton({
  projectId,
  isEmpty,
}: {
  projectId: string;
  isEmpty: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteProjectAction(projectId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao apagar projeto.");
      }
    });
  }

  if (!isEmpty) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="destructive" disabled>
          Apagar projeto
        </Button>
        <p className="text-xs text-muted-foreground">
          Só podes apagar projetos sem bugs, tarefas, notas ou credenciais. Remove o conteúdo
          primeiro.
        </p>
      </div>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" variant="destructive">Apagar projeto</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar este projeto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O projeto e os seus membros deixam de existir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            Apagar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
