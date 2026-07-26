"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { deleteFolderAction, renameFolderAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function TaskFolderActions({ folderId, name }: { folderId: string; name: string }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [isPending, startTransition] = useTransition();

  function handleRename() {
    if (!newName.trim()) return;
    const formData = new FormData();
    formData.set("name", newName.trim());
    startTransition(async () => {
      const result = await renameFolderAction(folderId, {}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setRenameOpen(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteFolderAction(folderId);
        setDeleteOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao apagar pasta.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ações da pasta"
              onClick={(event: React.MouseEvent) => event.preventDefault()}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => {
              setNewName(name);
              setRenameOpen(true);
            }}
          >
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            Apagar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
          </DialogHeader>
          <Input value={newName} onChange={(event) => setNewName(event.target.value)} autoFocus />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" disabled={isPending || !newName.trim()} onClick={handleRename}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              As tarefas desta pasta não são apagadas, apenas ficam sem pasta. Subpastas dentro
              desta são apagadas também.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleDelete}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
