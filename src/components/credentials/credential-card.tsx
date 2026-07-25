"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";

import { revealCredentialAction } from "@/actions/credentials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditCredentialDialog } from "@/components/credentials/edit-credential-dialog";
import { DeleteCredentialButton } from "@/components/credentials/delete-credential-button";

type Credential = {
  id: string;
  serviceName: string;
  url: string | null;
  username: string | null;
};

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  } catch {
    toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
  }
}

export function CredentialCard({ credential }: { credential: Credential }) {
  const [revealed, setRevealed] = useState<{ password: string; notes: string | null } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function handleToggleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    startTransition(async () => {
      try {
        const result = await revealCredentialAction(credential.id);
        setRevealed({ password: result.password, notes: result.notes });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao aceder à credencial.");
      }
    });
  }

  async function handleCopyPassword() {
    if (revealed) {
      await copyToClipboard(revealed.password, "Password");
      return;
    }
    startTransition(async () => {
      try {
        const result = await revealCredentialAction(credential.id);
        await copyToClipboard(result.password, "Password");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao aceder à credencial.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{credential.serviceName}</CardTitle>
          {credential.url && (
            <a
              href={credential.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:underline"
            >
              {credential.url}
            </a>
          )}
        </div>
        <div className="flex gap-1">
          <EditCredentialDialog credential={credential} />
          <DeleteCredentialButton credentialId={credential.id} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {credential.username && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Username</p>
              <p>{credential.username}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => copyToClipboard(credential.username!, "Username")}
              aria-label="Copiar username"
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Password</p>
            <p className="font-mono">{revealed ? revealed.password : "••••••••••"}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={handleToggleReveal}
              aria-label={revealed ? "Esconder password" : "Mostrar password"}
            >
              {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={handleCopyPassword}
              aria-label="Copiar password"
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>

        {revealed?.notes && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="whitespace-pre-wrap">{revealed.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
