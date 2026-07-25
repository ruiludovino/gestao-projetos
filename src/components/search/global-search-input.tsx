"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function GlobalSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    router.push(`/pesquisa?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-lg">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Pesquisar em bugs, tarefas, notas e projetos..."
        className="pl-9"
        autoFocus
      />
    </form>
  );
}
