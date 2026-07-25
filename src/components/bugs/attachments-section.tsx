"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

import { deleteAttachmentAction, uploadAttachmentAction } from "@/actions/bugs";
import { Button } from "@/components/ui/button";

type Attachment = {
  id: string;
  url: string;
  filename: string;
  uploadedBy: { name: string | null; email: string | null };
};

export function AttachmentsSection({
  bugId,
  attachments,
  canUpload,
}: {
  bugId: string;
  attachments: Attachment[];
  canUpload: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        await uploadAttachmentAction(bugId, formData);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao enviar imagem.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function handleDelete(attachmentId: string) {
    startTransition(async () => {
      try {
        await deleteAttachmentAction(attachmentId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover anexo.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="group relative overflow-hidden rounded-lg border">
              <a href={attachment.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="aspect-square w-full object-cover"
                />
              </a>
              <Button
                variant="destructive"
                size="icon-sm"
                className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => handleDelete(attachment.id)}
                aria-label="Remover anexo"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {isPending ? "A enviar..." : "Anexar imagem"}
          </Button>
        </div>
      )}
    </div>
  );
}
