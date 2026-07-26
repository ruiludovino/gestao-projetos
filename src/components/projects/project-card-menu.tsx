"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { deleteProjectAction, setProjectArchivedAction } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProjectCardMenu({
  projectId,
  archived,
  canArchive,
  canDelete,
}: {
  projectId: string;
  archived: boolean;
  canArchive: boolean;
  canDelete: boolean;
}) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!canArchive && !canDelete) return null;

  function handleArchiveConfirm() {
    startTransition(async () => {
      try {
        await setProjectArchivedAction(projectId, !archived);
        toast.success(
          archived ? "Projeto removido do histórico." : "Projeto enviado para o histórico.",
        );
        setArchiveOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar projeto.");
      }
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      try {
        await deleteProjectAction(projectId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao apagar projeto.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Ações do projeto">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent>
          {canArchive && (
            <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
              {archived ? "Remover do histórico" : "Enviar para histórico"}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Apagar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived
                ? "Remover este projeto do histórico?"
                : "Enviar este projeto para o histórico?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archived
                ? "O projeto volta a aparecer como ativo para todos os membros."
                : "O projeto passa a aparecer no histórico em vez de ativo, mas os dados não são apagados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleArchiveConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto, membros, bugs, tarefas, notas e
              credenciais associados deixam de existir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleDeleteConfirm}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
