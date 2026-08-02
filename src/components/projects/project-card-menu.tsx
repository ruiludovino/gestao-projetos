"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";

import {
  deleteProjectAction,
  duplicateProjectAction,
  setProjectArchivedAction,
  toggleProjectPinAction,
  updateProjectAction,
} from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  name,
  description,
  archived,
  pinned,
  canArchive,
  canDelete,
  canDuplicate,
}: {
  projectId: string;
  name: string;
  description: string | null;
  archived: boolean;
  pinned: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState(`${name} (cópia)`);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTogglePin() {
    startTransition(async () => {
      await toggleProjectPinAction(projectId);
      toast.success(pinned ? "Projeto desafixado." : "Projeto fixado na barra lateral.");
      router.refresh();
    });
  }

  function handleRenameConfirm() {
    if (!newName.trim()) return;
    const formData = new FormData();
    formData.set("name", newName.trim());
    formData.set("description", description ?? "");
    startTransition(async () => {
      const result = await updateProjectAction(projectId, {}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.fieldErrors) {
        toast.error(Object.values(result.fieldErrors)[0]?.[0] ?? "Dados inválidos.");
        return;
      }
      toast.success("Projeto renomeado.");
      setRenameOpen(false);
      router.refresh();
    });
  }

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

  function handleDuplicateConfirm() {
    if (!duplicateName.trim()) return;
    setDuplicateError(null);
    startTransition(async () => {
      try {
        const result = await duplicateProjectAction(projectId, duplicateName.trim());
        if (result?.error) {
          setDuplicateError(result.error);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao duplicar projeto.");
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
          <DropdownMenuItem onClick={handleTogglePin} disabled={isPending}>
            {pinned ? (
              <>
                <PinOff className="size-4" />
                Desafixar
              </>
            ) : (
              <>
                <Pin className="size-4" />
                Fixar na barra lateral
              </>
            )}
          </DropdownMenuItem>
          {canArchive && (
            <DropdownMenuItem
              onClick={() => {
                setNewName(name);
                setRenameOpen(true);
              }}
            >
              Renomear
            </DropdownMenuItem>
          )}
          {canDuplicate && (
            <DropdownMenuItem
              onClick={() => {
                setDuplicateName(`${name} (cópia)`);
                setDuplicateError(null);
                setDuplicateOpen(true);
              }}
            >
              Duplicar projeto
            </DropdownMenuItem>
          )}
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

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-project-name">Nome do projeto</Label>
            <Input
              id="rename-project-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" disabled={isPending || !newName.trim()} onClick={handleRenameConfirm}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar projeto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cria uma cópia completa deste projeto (tarefas, bugs, notas, regras, rotas e
            credenciais) num novo projeto, do qual ficas Admin.
          </p>
          <div className="space-y-2">
            <Label htmlFor="duplicate-project-name">Nome do novo projeto</Label>
            <Input
              id="duplicate-project-name"
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
              autoFocus
            />
          </div>
          {duplicateError && <p className="text-sm text-destructive">{duplicateError}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button
              type="button"
              disabled={isPending || !duplicateName.trim()}
              onClick={handleDuplicateConfirm}
            >
              {isPending ? "A duplicar..." : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
