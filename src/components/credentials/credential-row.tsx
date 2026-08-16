"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import { BillingCycle } from "@prisma/client";

import {
  copyCredentialToProjectAction,
  revealCredentialAction,
  type CredentialCategoryOption,
} from "@/actions/credentials";
import { formatCredentialCost } from "@/components/credentials/billing-cycle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { EditCredentialDialog } from "@/components/credentials/edit-credential-dialog";
import { DeleteCredentialButton } from "@/components/credentials/delete-credential-button";
import { CopyToProjectDialog } from "@/components/shared/copy-to-project-dialog";

type Member = { userId: string; user: { name: string | null; email: string | null } };
type Project = { id: string; name: string };

type Credential = {
  id: string;
  projectId: string;
  serviceName: string;
  url: string | null;
  username: string | null;
  assigneeId: string | null;
  assignee: { name: string | null; email: string | null } | null;
  createdBy: { name: string | null; email: string | null };
  categoryId: string | null;
  category: { name: string; color: string } | null;
  cost: number | null;
  billingCycle: BillingCycle | null;
};

export async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  } catch {
    toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
  }
}

export function CredentialRow({
  credential,
  members,
  categories,
  canDelete,
  copyTargetProjects,
}: {
  credential: Credential;
  members: Member[];
  categories: CredentialCategoryOption[];
  canDelete: boolean;
  copyTargetProjects: Project[];
}) {
  const [revealed, setRevealed] = useState<{ password: string; notes: string | null } | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);
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
    <TableRow
      className="cursor-pointer"
      onClick={() => setEditOpen(true)}
    >
      <TableCell>
        <p className="font-medium">{credential.serviceName}</p>
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
      </TableCell>
      <TableCell>
        {credential.username ? (
          <div className="flex items-center gap-1">
            <span className="text-sm">{credential.username}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(event) => {
                event.stopPropagation();
                copyToClipboard(credential.username!, "Username");
              }}
              aria-label="Copiar username"
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm">{revealed ? revealed.password : "••••••••••"}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              handleToggleReveal();
            }}
            aria-label={revealed ? "Esconder password" : "Mostrar password"}
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              handleCopyPassword();
            }}
            aria-label="Copiar password"
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      </TableCell>
      <TableCell>
        {credential.category ? (
          <Badge
            variant="outline"
            className="border-transparent"
            style={{
              backgroundColor: `${credential.category.color}33`,
              color: credential.category.color,
            }}
          >
            {credential.category.name}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {formatCredentialCost(credential.cost, credential.billingCycle) ?? "—"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {credential.assignee?.name ?? credential.assignee?.email ?? "Ninguém"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm">{credential.createdBy.name ?? credential.createdBy.email}</span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <CopyToProjectDialog
            projects={copyTargetProjects}
            onCopy={(targetProjectId) =>
              copyCredentialToProjectAction(credential.id, targetProjectId)
            }
            triggerLabel="Copiar para projeto"
            iconOnly
          />
          <EditCredentialDialog
            credential={credential}
            members={members}
            categories={categories}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          {canDelete && <DeleteCredentialButton credentialId={credential.id} />}
        </div>
      </TableCell>
    </TableRow>
  );
}
