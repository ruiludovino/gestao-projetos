"use client";

import { useState, useTransition } from "react";
import { ProjectRole } from "@prisma/client";
import { Plus } from "lucide-react";

import { addMemberAction } from "@/actions/projects";
import { ROLE_LABELS } from "@/components/shared/role-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddMemberDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addMemberAction(projectId, {}, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.fieldErrors) {
        setError(Object.values(result.fieldErrors)[0]?.[0] ?? "Dados inválidos.");
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Adicionar membro
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar membro ao projeto</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="developer@exemplo.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              A pessoa tem de já ter conta criada (GitHub ou registo).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" items={ROLE_LABELS} defaultValue={ProjectRole.DEVELOPER}>
              <SelectTrigger className="w-full" id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={ProjectRole.DEVELOPER}>Developer</SelectItem>
                <SelectItem value={ProjectRole.VIEWER}>Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "A adicionar..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
