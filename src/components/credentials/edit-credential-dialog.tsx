"use client";

import { useState, useTransition } from "react";
import { Pencil, Copy, Eye, EyeOff } from "lucide-react";
import { BillingCycle } from "@prisma/client";
import { toast } from "sonner";

import { revealCredentialAction, updateCredentialAction } from "@/actions/credentials";
import { copyToClipboard } from "@/components/credentials/credential-row";
import { BILLING_CYCLE_LABELS } from "@/components/credentials/billing-cycle";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NO_ASSIGNEE = "__unassigned__";
const NO_BILLING_CYCLE = "__none__";

type Member = { userId: string; user: { name: string | null; email: string | null } };

type Credential = {
  id: string;
  serviceName: string;
  url: string | null;
  username: string | null;
  assigneeId: string | null;
  cost: number | null;
  billingCycle: BillingCycle | null;
};

export function EditCredentialDialog({
  credential,
  members,
}: {
  credential: Credential;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setError(null);
    if (next) {
      setPasswordVisible(false);
      setLoadingNotes(true);
      revealCredentialAction(credential.id)
        .then((result) => {
          setNotes(result.notes ?? "");
          setCurrentPassword(result.password);
        })
        .catch(() => toast.error("Erro ao carregar dados existentes."))
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
            <div className="flex items-center gap-1">
              <Input
                id="username"
                name="username"
                defaultValue={credential.username ?? ""}
                className="flex-1"
              />
              {credential.username && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copyToClipboard(credential.username!, "Username")}
                  aria-label="Copiar username"
                >
                  <Copy className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password atual</Label>
            <div className="flex items-center gap-1">
              <span className="flex-1 rounded-md border px-3 py-2 font-mono text-sm">
                {loadingNotes
                  ? "A carregar..."
                  : passwordVisible
                    ? (currentPassword ?? "")
                    : "••••••••••"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={loadingNotes}
                onClick={() => setPasswordVisible((v) => !v)}
                aria-label={passwordVisible ? "Esconder password" : "Mostrar password"}
              >
                {passwordVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={loadingNotes}
                onClick={() => currentPassword && copyToClipboard(currentPassword, "Password")}
                aria-label="Copiar password"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Custo (opcional)</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={credential.cost ?? ""}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingCycle">Periodicidade</Label>
              <Select
                name="billingCycle"
                items={{
                  [NO_BILLING_CYCLE]: "Sem periodicidade",
                  ...BILLING_CYCLE_LABELS,
                }}
                defaultValue={credential.billingCycle ?? NO_BILLING_CYCLE}
              >
                <SelectTrigger className="w-full" id="billingCycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BILLING_CYCLE}>Sem periodicidade</SelectItem>
                  {Object.values(BillingCycle).map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {BILLING_CYCLE_LABELS[cycle]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigneeId">Responsável</Label>
            <Select
              name="assigneeId"
              items={{
                [NO_ASSIGNEE]: "Ninguém",
                ...Object.fromEntries(
                  members.map((member) => [member.userId, member.user.name ?? member.user.email]),
                ),
              }}
              defaultValue={credential.assigneeId ?? NO_ASSIGNEE}
            >
              <SelectTrigger className="w-full" id="assigneeId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ASSIGNEE}>Ninguém</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.user.name ?? member.user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
