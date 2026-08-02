"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";

import { setTaskStatusAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ResolveTaskButton({
  taskId,
  isHistory,
}: {
  taskId: string;
  isHistory: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await setTaskStatusAction(taskId, isHistory ? TaskStatus.TODO : TaskStatus.DONE);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar a tarefa.");
      }
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            onClick={handleClick}
            aria-label={isHistory ? "Reabrir tarefa" : "Concluída"}
          >
            {isHistory ? <RotateCcw className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          </Button>
        }
      />
      <TooltipContent>{isHistory ? "Reabrir" : "Concluída"}</TooltipContent>
    </Tooltip>
  );
}
