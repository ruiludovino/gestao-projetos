"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyNoteContentButton({ content }: { content: string }) {
  async function handleCopy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Conteúdo copiado.");
    } catch {
      toast.error("Não foi possível copiar o conteúdo.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Copiar conteúdo da nota"
      onClick={handleCopy}
    >
      <Copy className="size-3.5" />
    </Button>
  );
}
