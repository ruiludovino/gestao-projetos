"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { cancelInviteAction } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/role-badge";
import type { ProjectRole } from "@prisma/client";

type Invite = { id: string; email: string; role: ProjectRole };

export function PendingInvites({ invites }: { invites: Invite[] }) {
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) return null;

  function handleCancel(inviteId: string) {
    startTransition(async () => {
      try {
        await cancelInviteAction(inviteId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao cancelar convite.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Convites pendentes</p>
      {invites.map((invite) => (
        <div key={invite.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{invite.email}</span>
            <RoleBadge role={invite.role} />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            onClick={() => handleCancel(invite.id)}
            aria-label="Cancelar convite"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
