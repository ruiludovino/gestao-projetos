"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { revealCredentialAction, updateCredentialAction } from "@/actions/credentials";
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
import { Textarea } from "@/components/ui/textarea";

type Credential = {
  id: string;
  serviceName: string;
  url: string | null;
  username: string | null;
};

export function EditCredentialDialog({ credential }: { credential: Credential }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setError(null);
    if (next) {
      setLoadingNotes(true);
      revealCredentialAction(credential.id)
        .then((result) => setNotes(result.notes ?? ""))
        .catch(() => toast.error("Erro ao carregar notas existentes."))
        .finally(() => setLoadingNotes(false));
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateCredentialAction(credential.id, {}, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.fieldErrors) {
        setError(Object.values(result.fieldErrors)[0]?.[0] ?? "Dados inválidos.");
        return;
      }
      toast.success("Credencial atualizada.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Editar credencial">
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar credencial</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceName">Nome do serviço</Label>
            <Input
              id="serviceName"
              name="serviceName"
              defaultValue={credential.serviceName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" name="url" defaultValue={credential.url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={credential.username ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Nova password (opcional)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Deixa vazio para manter a atual"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={loadingNotes}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="submit" disabled={isPending || loadingNotes}>
              {isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
