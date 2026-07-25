"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";

import { setTaskStatusAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";

export function ResolveTaskButton({
  taskId,
  isHistory,
}: {
  taskId: string;
  isHistory: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      try {
        await setTaskStatusAction(taskId, isHistory ? TaskStatus.TODO : TaskStatus.DONE);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar a tarefa.");
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isHistory ? (
        <>
          <RotateCcw className="size-3.5" />
          Reabrir
        </>
      ) : (
        <>
          <CheckCircle2 className="size-3.5" />
          Concluída
        </>
      )}
    </Button>
  );
}
