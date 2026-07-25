"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { createLabelAction, toggleBugLabelAction } from "@/actions/bugs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type LabelOption = { id: string; name: string; color: string };

export function BugLabelsEditor({
  bugId,
  projectId,
  allLabels,
  selectedLabelIds,
  disabled,
}: {
  bugId: string;
  projectId: string;
  allLabels: LabelOption[];
  selectedLabelIds: string[];
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#64748b");
  const [creating, setCreating] = useState(false);

  function toggle(labelId: string, checked: boolean) {
    startTransition(async () => {
      try {
        await toggleBugLabelAction(bugId, labelId, checked);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar label.");
      }
    });
  }

  function handleCreateLabel() {
    if (!newLabelName.trim()) return;
    setCreating(true);
    const formData = new FormData();
    formData.set("name", newLabelName.trim());
    formData.set("color", newLabelColor);
    startTransition(async () => {
      const result = await createLabelAction(projectId, {}, formData);
      setCreating(false);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setNewLabelName("");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allLabels.map((label) => {
        const active = selectedLabelIds.includes(label.id);
        return (
          <button
            key={label.id}
            type="button"
            disabled={disabled || isPending}
            onClick={() => toggle(label.id, !active)}
            className="disabled:opacity-50"
          >
            <Badge
              variant="outline"
              className="cursor-pointer border-transparent"
              style={{
                backgroundColor: active ? `${label.color}33` : "transparent",
                color: active ? label.color : "var(--muted-foreground)",
                borderColor: active ? "transparent" : "var(--border)",
              }}
            >
              {label.name}
            </Badge>
          </button>
        );
      })}

      {!disabled && (
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon-sm">
                <Plus className="size-3.5" />
              </Button>
            }
          />
          <PopoverContent className="w-56 space-y-2">
            <Input
              placeholder="Nome da label"
              value={newLabelName}
              onChange={(event) => setNewLabelName(event.target.value)}
            />
            <input
              type="color"
              value={newLabelColor}
              onChange={(event) => setNewLabelColor(event.target.value)}
              className="h-8 w-full"
            />
            <Button
              size="sm"
              className="w-full"
              disabled={creating || !newLabelName.trim()}
              onClick={handleCreateLabel}
            >
              Criar label
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
