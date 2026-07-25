"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/shared/markdown";

type MarkdownEditorProps = {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  id?: string;
};

export function MarkdownEditor({
  name,
  defaultValue = "",
  rows = 8,
  placeholder,
  id,
}: MarkdownEditorProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Tabs defaultValue="escrever">
      <TabsList>
        <TabsTrigger value="escrever">Escrever</TabsTrigger>
        <TabsTrigger value="pre-visualizar">Pré-visualizar</TabsTrigger>
      </TabsList>
      <TabsContent value="escrever">
        <Textarea
          id={id}
          name={name}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">Suporta markdown (GFM).</p>
      </TabsContent>
      <TabsContent value="pre-visualizar">
        <div className="min-h-24 rounded-lg border p-3">
          {value ? <Markdown content={value} /> : (
            <p className="text-sm text-muted-foreground">Nada para mostrar.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
