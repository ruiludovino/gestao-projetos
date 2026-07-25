"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createFolderAction } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CreateFolderPopover({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.set("name", name.trim());
    startTransition(async () => {
      const result = await createFolderAction(projectId, {}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setName("");
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Nova pasta">
            <Plus className="size-3.5" />
          </Button>
        }
      />
      <PopoverContent className="w-56 space-y-2">
        <Input
          placeholder="Nome da pasta"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button size="sm" className="w-full" disabled={isPending || !name.trim()} onClick={handleCreate}>
          Criar pasta
        </Button>
      </PopoverContent>
    </Popover>
  );
}
