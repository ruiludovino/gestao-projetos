"use client";

import { useTransition } from "react";
import { BugStatus } from "@prisma/client";
import { toast } from "sonner";

import { updateBugStatusAction } from "@/actions/bugs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LABELS: Record<BugStatus, string> = {
  ABERTO: "Aberto",
  EM_PROGRESSO: "Em progresso",
  RESOLVIDO: "Resolvido",
  FECHADO: "Fechado",
};

export function BugStatusSelect({
  bugId,
  value,
  disabled,
}: {
  bugId: string;
  value: BugStatus;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      try {
        await updateBugStatusAction(bugId, next as BugStatus);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar estado.");
      }
    });
  }

  return (
    <Select items={LABELS} value={value} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(BugStatus).map((status) => (
          <SelectItem key={status} value={status}>
            {LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
