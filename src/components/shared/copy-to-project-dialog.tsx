"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Project = { id: string; name: string };

export function CopyToProjectDialog({
  projects,
  onCopy,
  triggerLabel = "Copiar para projeto",
  iconOnly = false,
}: {
  projects: Project[];
  onCopy: (targetProjectId: string) => Promise<{ error?: string; id?: string } | void>;
  triggerLabel?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(projects[0]?.id);
  const [isPending, startTransition] = useTransition();

  if (projects.length === 0) return null;

  function handleCopy() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await onCopy(selected);
        if (result && "error" in result && result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Copiado com sucesso.");
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao copiar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={iconOnly ? "icon-sm" : "sm"}
            aria-label={triggerLabel}
          >
            <Copy className="size-3.5" />
            {!iconOnly && triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar para outro projeto</DialogTitle>
        </DialogHeader>
        <Select
          items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
          value={selected}
          onValueChange={(next) => setSelected(next ?? undefined)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" disabled={isPending || !selected} onClick={handleCopy}>
            {isPending ? "A copiar..." : "Copiar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
