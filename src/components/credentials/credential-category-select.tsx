"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  createCredentialCategoryAction,
  deleteCredentialCategoryAction,
  renameCredentialCategoryAction,
  type CredentialCategoryOption,
} from "@/actions/credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#64748b";

function CategoryDot({ color }: { color: string }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export function CredentialCategorySelect({
  projectId,
  categories: initialCategories,
  defaultValue,
  name = "categoryId",
  disabled,
}: {
  projectId: string;
  categories: CredentialCategoryOption[];
  defaultValue?: string | null;
  name?: string;
  disabled?: boolean;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [selectedId, setSelectedId] = useState<string | null>(defaultValue ?? null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);

  const selected = categories.find((category) => category.id === selectedId) ?? null;

  function startEdit(category: CredentialCategoryOption, event: React.MouseEvent) {
    event.stopPropagation();
    setConfirmDeleteId(null);
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  }

  function cancelEdit(event?: React.MouseEvent) {
    event?.stopPropagation();
    setEditingId(null);
  }

  async function saveEdit(event: React.MouseEvent) {
    event.stopPropagation();
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const updated = await renameCredentialCategoryAction(editingId, editName.trim(), editColor);
      setCategories((prev) =>
        prev.map((category) => (category.id === updated.id ? updated : category)),
      );
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao editar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(categoryId: string, event: React.MouseEvent) {
    event.stopPropagation();
    setSaving(true);
    try {
      await deleteCredentialCategoryAction(categoryId);
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
      if (selectedId === categoryId) setSelectedId(null);
      setConfirmDeleteId(null);
      toast.success("Categoria removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await createCredentialCategoryAction(projectId, newName.trim(), newColor);
      setCategories((prev) => [...prev, created]);
      setSelectedId(created.id);
      setNewName("");
      setNewColor(DEFAULT_COLOR);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <input type="hidden" name={name} value={selectedId ?? ""} />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditingId(null);
            setConfirmDeleteId(null);
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="w-full justify-between font-normal"
            >
              <span className="flex items-center gap-1.5">
                {selected ? (
                  <>
                    <CategoryDot color={selected.color} />
                    {selected.name}
                  </>
                ) : (
                  <span className="text-muted-foreground">Sem categoria</span>
                )}
              </span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </Button>
          }
        />
        <PopoverContent className="w-72 p-2" align="start">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                selectedId === null && "bg-accent",
              )}
            >
              <span className="flex-1 text-muted-foreground">Sem categoria</span>
              {selectedId === null && <Check className="size-3.5" />}
            </button>

            {categories.map((category) => (
              <div key={category.id}>
                {editingId === category.id ? (
                  <div className="flex items-center gap-1 rounded-md px-2 py-1">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(event) => setEditColor(event.target.value)}
                      className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="h-7 flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={saving || !editName.trim()}
                      onClick={saveEdit}
                      aria-label="Guardar categoria"
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={cancelEdit}
                      aria-label="Cancelar edição"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : confirmDeleteId === category.id ? (
                  <div className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm">
                    <span className="flex-1 text-muted-foreground">
                      Remover &quot;{category.name}&quot;?
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={saving}
                      onClick={(event) => confirmDelete(category.id, event)}
                      aria-label="Confirmar remoção"
                    >
                      <Check className="size-3.5 text-destructive" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmDeleteId(null);
                      }}
                      aria-label="Cancelar remoção"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                      selectedId === category.id && "bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(category.id);
                        setOpen(false);
                      }}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <CategoryDot color={category.color} />
                      <span className="flex-1">{category.name}</span>
                      {selectedId === category.id && <Check className="size-3.5 shrink-0" />}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(event) => startEdit(category, event)}
                      aria-label="Editar categoria"
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmDeleteId(category.id);
                      }}
                      aria-label="Remover categoria"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1 border-t pt-2">
            <input
              type="color"
              value={newColor}
              onChange={(event) => setNewColor(event.target.value)}
              className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <Input
              placeholder="Nova categoria"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCreate();
                }
              }}
              className="h-7 flex-1"
            />
            <Button
              type="button"
              size="icon-sm"
              disabled={saving || !newName.trim()}
              onClick={handleCreate}
              aria-label="Adicionar categoria"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
